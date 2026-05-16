#!/usr/bin/env python3
"""SoveReign13 Aegis Agent.

A local-first repo operator for SoveReign13 Node OS.
It does real filesystem work: scans repositories, creates plans, calls the local
Orynth router for proposals, extracts unified diffs, validates patches with
`git apply --check`, applies patches when explicitly requested, and writes a
run ledger under .s13/runs.

It intentionally avoids pretending to edit code when no model is available.
"""
from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import json
import os
import re
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

DEFAULT_ROUTER = os.environ.get("ORYNTH_ROUTER_URL", "http://127.0.0.1:13131/v1/chat/completions")
DEFAULT_MODEL = os.environ.get("ORYNTH_AGENT_MODEL", "coder")
MAX_FILE_BYTES = int(os.environ.get("S13_AGENT_MAX_FILE_BYTES", str(256 * 1024)))
MAX_CONTEXT_BYTES = int(os.environ.get("S13_AGENT_MAX_CONTEXT_BYTES", str(120 * 1024)))

EXCLUDE_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "dist", "build", ".next", ".nuxt", ".cache",
    "coverage", "target", "vendor", "venv", ".venv", "__pycache__", ".s13", ".direnv",
    "result", "result-iso", ".terraform", ".turbo", ".pytest_cache", ".mypy_cache",
}
TEXT_EXTS = {
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".kt",
    ".c", ".h", ".cpp", ".hpp", ".cs", ".php", ".rb", ".swift", ".html", ".css",
    ".scss", ".json", ".jsonc", ".md", ".mdx", ".yml", ".yaml", ".toml", ".ini", ".env",
    ".sh", ".bash", ".zsh", ".sql", ".nix", ".dockerfile", "", ".txt",
}
LANG_BY_EXT = {
    ".js": "JavaScript", ".jsx": "React JSX", ".ts": "TypeScript", ".tsx": "React TSX",
    ".py": "Python", ".go": "Go", ".rs": "Rust", ".java": "Java", ".kt": "Kotlin",
    ".php": "PHP", ".rb": "Ruby", ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
    ".json": "JSON", ".md": "Markdown", ".yml": "YAML", ".yaml": "YAML", ".nix": "Nix",
    ".sh": "Shell", ".sql": "SQL",
}
RISK_PATTERNS = [
    ("hardcoded secret marker", re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{10,}")),
    ("dangerous shell execution", re.compile(r"(?i)(exec\(|eval\(|subprocess\.|child_process|os\.system)")),
    ("todo/fixme", re.compile(r"(?i)\b(todo|fixme|hack|xxx)\b")),
    ("mock/fake marker", re.compile(r"(?i)\b(mock|fake|placeholder|stub|demo only|not implemented)\b")),
]


def now_id() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def run(cmd: List[str], cwd: Path, check: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check)


def ensure_repo(path: str | Path) -> Path:
    repo = Path(path).expanduser().resolve()
    if not repo.exists():
        raise SystemExit(f"Workspace does not exist: {repo}")
    if not repo.is_dir():
        raise SystemExit(f"Workspace is not a directory: {repo}")
    return repo


def s13_dir(repo: Path) -> Path:
    d = repo / ".s13"
    (d / "runs").mkdir(parents=True, exist_ok=True)
    (d / "queue").mkdir(parents=True, exist_ok=True)
    (d / "reports").mkdir(parents=True, exist_ok=True)
    return d


def should_skip_dir(name: str) -> bool:
    return name in EXCLUDE_DIRS or name.endswith(".egg-info")


def is_probably_text(path: Path) -> bool:
    if path.suffix.lower() in TEXT_EXTS:
        return True
    return path.name in {"Dockerfile", "Makefile", "Procfile", "LICENSE", "README"}


def iter_files(repo: Path) -> Iterable[Path]:
    for base, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        base_path = Path(base)
        for file in files:
            path = base_path / file
            if path.is_file():
                yield path


def rel(repo: Path, path: Path) -> str:
    return str(path.relative_to(repo)).replace(os.sep, "/")


def read_text_limited(path: Path, max_bytes: int = MAX_FILE_BYTES) -> str:
    data = path.read_bytes()[:max_bytes]
    return data.decode("utf-8", errors="replace")


def detect_commands(repo: Path) -> Dict[str, List[str]]:
    commands: Dict[str, List[str]] = {"install": [], "smoke": [], "test": [], "build": [], "lint": []}
    package_json = repo / "package.json"
    if package_json.exists():
        try:
            pkg = json.loads(package_json.read_text(encoding="utf-8"))
            scripts = pkg.get("scripts", {}) if isinstance(pkg, dict) else {}
            pm = "npm"
            if (repo / "pnpm-lock.yaml").exists():
                pm = "pnpm"
            elif (repo / "yarn.lock").exists():
                pm = "yarn"
            commands["install"].append(f"{pm} install")
            for key in ["test", "build", "lint", "typecheck", "smoke"]:
                if key in scripts:
                    bucket = "smoke" if key == "smoke" else key if key in commands else "test"
                    commands.setdefault(bucket, []).append(f"{pm} run {key}")
        except Exception:
            pass
    if (repo / "requirements.txt").exists():
        commands["install"].append("python -m pip install -r requirements.txt")
    if (repo / "pyproject.toml").exists():
        commands["test"].append("python -m pytest")
    if (repo / "Cargo.toml").exists():
        commands["test"].append("cargo test")
        commands["build"].append("cargo build")
    if (repo / "go.mod").exists():
        commands["test"].append("go test ./...")
        commands["build"].append("go build ./...")
    if (repo / "flake.nix").exists():
        commands["smoke"].append("nix flake show")
    if (repo / "scripts/smoke.sh").exists():
        commands["smoke"].insert(0, "./scripts/smoke.sh")
    return {k: v for k, v in commands.items() if v}


def scan_repo(repo: Path) -> Dict[str, Any]:
    language_counts: Dict[str, int] = {}
    files: List[Dict[str, Any]] = []
    risk_hits: List[Dict[str, Any]] = []
    total_bytes = 0
    for path in iter_files(repo):
        r = rel(repo, path)
        try:
            size = path.stat().st_size
        except OSError:
            continue
        total_bytes += size
        ext = path.suffix.lower()
        language = LANG_BY_EXT.get(ext, "Other")
        language_counts[language] = language_counts.get(language, 0) + 1
        entry = {"path": r, "bytes": size, "language": language}
        files.append(entry)
        if is_probably_text(path) and size <= MAX_FILE_BYTES:
            try:
                text = read_text_limited(path)
            except OSError:
                continue
            for label, pattern in RISK_PATTERNS:
                for match in pattern.finditer(text):
                    line_no = text.count("\n", 0, match.start()) + 1
                    risk_hits.append({"path": r, "line": line_no, "kind": label, "sample": match.group(0)[:140]})
                    break
    files.sort(key=lambda x: (x["language"], x["path"]))
    commands = detect_commands(repo)
    git = run(["git", "status", "--short"], repo) if (repo / ".git").exists() else None
    return {
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "workspace": str(repo),
        "git_present": (repo / ".git").exists(),
        "git_status_short": git.stdout.strip().splitlines() if git else [],
        "file_count": len(files),
        "total_bytes": total_bytes,
        "languages": dict(sorted(language_counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "commands": commands,
        "risk_hits": risk_hits[:200],
        "files": files[:1000],
    }


def markdown_scan(scan: Dict[str, Any]) -> str:
    lines = [
        "# SoveReign13 Aegis Repository Scan",
        "",
        f"Generated: {scan['generated_at_utc']}",
        f"Workspace: `{scan['workspace']}`",
        f"Git present: `{scan['git_present']}`",
        f"Files indexed: `{scan['file_count']}`",
        f"Total bytes: `{scan['total_bytes']}`",
        "",
        "## Language Map",
    ]
    for lang, count in scan["languages"].items():
        lines.append(f"- {lang}: {count}")
    lines += ["", "## Detected Commands"]
    for bucket, cmds in scan.get("commands", {}).items():
        lines.append(f"- {bucket}: " + "; ".join(f"`{cmd}`" for cmd in cmds))
    lines += ["", "## Risk / Work Markers"]
    if scan["risk_hits"]:
        for hit in scan["risk_hits"][:80]:
            lines.append(f"- `{hit['path']}:{hit['line']}` — {hit['kind']}: `{hit['sample']}`")
    else:
        lines.append("- No risk markers found in scanned text files.")
    lines += ["", "## File Inventory Sample"]
    for item in scan["files"][:250]:
        lines.append(f"- `{item['path']}` — {item['language']} — {item['bytes']} bytes")
    return "\n".join(lines) + "\n"


def deterministic_plan(scan: Dict[str, Any], objective: str) -> str:
    commands = scan.get("commands", {})
    risks = scan.get("risk_hits", [])
    lines = [
        "# SoveReign13 Aegis Work Plan",
        "",
        f"Objective: {objective}",
        f"Generated: {scan['generated_at_utc']}",
        "",
        "## Doctrine",
        "Use closure over theater. Do not claim implementation until behavior is proven. Prefer small patches with rollback.",
        "",
        "## Current Repo Facts",
        f"- Files indexed: {scan['file_count']}",
        f"- Git present: {scan['git_present']}",
        f"- Primary languages: {', '.join(list(scan['languages'].keys())[:8]) or 'unknown'}",
        "",
        "## Recommended Sequence",
        "1. Create a Reliquary backup before editing.",
        "2. Run the strongest existing smoke/test command before editing to capture baseline.",
        "3. Patch one lane at a time. Avoid sweeping rewrites unless requested.",
        "4. Run syntax/test/build checks after each patch.",
        "5. Update the proof ledger with exact commands and results.",
        "",
        "## Detected Proof Commands",
    ]
    if commands:
        for bucket, cmds in commands.items():
            for cmd in cmds:
                lines.append(f"- {bucket}: `{cmd}`")
    else:
        lines.append("- No project-native test/build command detected. Add one before claiming readiness.")
    lines += ["", "## Highest-Risk Markers"]
    if risks:
        for hit in risks[:25]:
            lines.append(f"- `{hit['path']}:{hit['line']}` — {hit['kind']}")
    else:
        lines.append("- No obvious TODO/mock/secret/danger markers detected in scanned files.")
    lines += ["", "## Next AI Patch Prompt", "Use `s13-agent propose --workspace . --task \"<specific objective>\"` to request a unified diff from Orynth."]
    return "\n".join(lines) + "\n"


def collect_context(repo: Path, scan: Dict[str, Any]) -> str:
    chunks: List[str] = []
    selected = []
    important_names = {"package.json", "README.md", "CLAUDE.md", "AGENTS.md", "vite.config.ts", "next.config.js", "app.py", "main.py", "server.py", "flake.nix"}
    for item in scan["files"]:
        p = repo / item["path"]
        if p.name in important_names or p.suffix.lower() in {".md", ".json", ".nix", ".py", ".js", ".ts", ".tsx"}:
            selected.append(p)
        if len(selected) >= 80:
            break
    total = 0
    for path in selected:
        if not path.exists() or path.stat().st_size > MAX_FILE_BYTES or not is_probably_text(path):
            continue
        text = read_text_limited(path)
        block = f"\n--- FILE: {rel(repo, path)} ---\n{text}\n"
        if total + len(block.encode("utf-8")) > MAX_CONTEXT_BYTES:
            break
        chunks.append(block)
        total += len(block.encode("utf-8"))
    return "".join(chunks)


def call_router(messages: List[Dict[str, str]], model: str = DEFAULT_MODEL, router_url: str = DEFAULT_ROUTER, fallback: bool = False) -> str:
    payload = {"model": model, "messages": messages, "stream": False, "fallback": fallback}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(router_url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:  # noqa: S310 operator-controlled local endpoint
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise SystemExit(f"Orynth router call failed: {exc}. Run `s13-ai-status` and install a model with `s13-install-brain coder`.")
    try:
        return body["choices"][0]["message"]["content"]
    except Exception as exc:
        raise SystemExit(f"Router returned an unexpected payload: {body}") from exc


def extract_diff(text: str) -> str:
    fence = re.search(r"```(?:diff|patch)?\s*\n(.*?\n)```", text, re.DOTALL | re.IGNORECASE)
    if fence and ("diff --git" in fence.group(1) or "--- " in fence.group(1)):
        return fence.group(1).strip() + "\n"
    idx = text.find("diff --git")
    if idx >= 0:
        return text[idx:].strip() + "\n"
    idx = text.find("--- ")
    if idx >= 0 and "+++ " in text[idx:idx + 500]:
        return text[idx:].strip() + "\n"
    return ""


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def cmd_init(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    queue = d / "queue" / "tasks.jsonl"
    queue.touch(exist_ok=True)
    (d / "README.md").write_text("# .s13\n\nSoveReign13 Aegis Agent run ledgers, queue, reports, and proposed patches.\n", encoding="utf-8")
    print(f"✅ Initialized {d}")
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    scan = scan_repo(repo)
    out_json = Path(args.out_json) if args.out_json else d / "reports" / "scan.json"
    out_md = Path(args.out_md) if args.out_md else d / "reports" / "scan.md"
    write_json(out_json, scan)
    out_md.write_text(markdown_scan(scan), encoding="utf-8")
    print(f"✅ Scan written: {out_json}")
    print(f"✅ Report written: {out_md}")
    return 0


def cmd_plan(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    scan = scan_repo(repo)
    plan = deterministic_plan(scan, args.objective)
    run_dir = d / "runs" / f"plan-{now_id()}"
    run_dir.mkdir(parents=True, exist_ok=True)
    write_json(run_dir / "scan.json", scan)
    (run_dir / "PLAN.md").write_text(plan, encoding="utf-8")
    print(f"✅ Plan written: {run_dir / 'PLAN.md'}")
    return 0


def cmd_propose(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    scan = scan_repo(repo)
    context = collect_context(repo, scan)
    run_dir = d / "runs" / f"propose-{now_id()}"
    run_dir.mkdir(parents=True, exist_ok=True)
    write_json(run_dir / "scan.json", scan)
    prompt = f"""
You are Orynth 7.6 inside SoveReign13 Node OS, operating as a code repair agent for Gray London Skyes and Tyrone Norman.

Task:
{args.task}

Rules:
- No theater. If the requested patch cannot be made safely from the visible context, say what files are needed.
- Prefer one coherent unified diff.
- Preserve existing branding and plumbing.
- Do not add placeholder public-facing content.
- Include a short proof plan after the diff.
- If you provide code changes, return a standard unified diff that can pass `git apply --check`.

Repository scan summary:
{json.dumps({k: scan[k] for k in ['file_count','languages','commands','risk_hits','git_status_short']}, indent=2)[:20000]}

Repository context:
{context}
""".strip()
    (run_dir / "PROMPT.md").write_text(prompt, encoding="utf-8")
    response = call_router([{"role": "user", "content": prompt}], model=args.model, fallback=args.fallback)
    (run_dir / "RESPONSE.md").write_text(response, encoding="utf-8")
    diff = extract_diff(response)
    if diff:
        (run_dir / "proposed.patch").write_text(diff, encoding="utf-8")
        check = run(["git", "apply", "--check", str(run_dir / "proposed.patch")], repo)
        (run_dir / "git-apply-check.stdout").write_text(check.stdout, encoding="utf-8")
        (run_dir / "git-apply-check.stderr").write_text(check.stderr, encoding="utf-8")
        if check.returncode == 0:
            print(f"✅ Proposed patch validates: {run_dir / 'proposed.patch'}")
        else:
            print(f"☐ Proposed patch did not validate. Inspect: {run_dir / 'git-apply-check.stderr'}")
    else:
        print("☐ Orynth returned no unified diff. Response saved for review.")
    print(f"✅ Run directory: {run_dir}")
    return 0


def cmd_apply_patch(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    patch = Path(args.patch).expanduser().resolve()
    if not patch.exists():
        raise SystemExit(f"Patch not found: {patch}")
    if not (repo / ".git").exists():
        raise SystemExit("Refusing to apply a patch outside a git repository.")
    check = run(["git", "apply", "--check", str(patch)], repo)
    if check.returncode != 0:
        sys.stderr.write(check.stderr)
        raise SystemExit("Patch failed `git apply --check`; nothing was changed.")
    if args.backup:
        backup_name = f"aegis-prepatch-{now_id()}"
        reliquary = repo / ".s13" / "reliquary"
        reliquary.mkdir(parents=True, exist_ok=True)
        run(["git", "diff", "--binary"], repo).stdout
        (reliquary / f"{backup_name}.status.txt").write_text(run(["git", "status", "--short"], repo).stdout, encoding="utf-8")
    if args.check_only:
        print("✅ Patch check passed. No changes applied because --check-only was used.")
        return 0
    apply = run(["git", "apply", str(patch)], repo)
    if apply.returncode != 0:
        sys.stderr.write(apply.stderr)
        raise SystemExit("Patch apply failed after check; inspect repository state.")
    print("✅ Patch applied.")
    if args.proof:
        for cmd in args.proof:
            print(f"\n$ {cmd}")
            proof = subprocess.run(cmd, cwd=str(repo), shell=True, text=True)  # noqa: S602 operator-provided proof command
            if proof.returncode != 0:
                raise SystemExit(f"Proof command failed: {cmd}")
    return 0


def cmd_queue_add(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    item = {"id": f"task-{now_id()}", "created_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"), "task": args.task, "status": "queued"}
    with (d / "queue" / "tasks.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"✅ Queued {item['id']}")
    return 0


def read_queue(queue: Path) -> List[Dict[str, Any]]:
    if not queue.exists():
        return []
    items = []
    for line in queue.read_text(encoding="utf-8").splitlines():
        if line.strip():
            items.append(json.loads(line))
    return items


def write_queue(queue: Path, items: List[Dict[str, Any]]) -> None:
    queue.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in items), encoding="utf-8")


def cmd_queue_run(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    queue = d / "queue" / "tasks.jsonl"
    items = read_queue(queue)
    pending = [item for item in items if item.get("status") == "queued"]
    if not pending:
        print("☐ No queued tasks.")
        return 0
    processed = 0
    for item in pending[: args.limit]:
        print(f"\n▶ {item['id']}: {item['task']}")
        item["status"] = "running"
        item["started_at_utc"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        write_queue(queue, items)
        ns = argparse.Namespace(workspace=str(repo), task=item["task"], model=args.model, fallback=args.fallback)
        try:
            cmd_propose(ns)
            item["status"] = "proposed"
            processed += 1
        except SystemExit as exc:
            item["status"] = "failed"
            item["error"] = str(exc)
        item["finished_at_utc"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        write_queue(queue, items)
        if args.sleep:
            time.sleep(args.sleep)
    print(f"\n✅ Queue run finished. Tasks processed: {processed}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    repo = ensure_repo(args.workspace)
    d = s13_dir(repo)
    print("SoveReign13 Aegis Agent")
    print(f"Workspace: {repo}")
    print(f"Ledger: {d}")
    if (repo / ".git").exists():
        print("\nGit status:")
        print(run(["git", "status", "--short"], repo).stdout or "clean")
    queue = read_queue(d / "queue" / "tasks.jsonl")
    counts: Dict[str, int] = {}
    for item in queue:
        counts[item.get("status", "unknown")] = counts.get(item.get("status", "unknown"), 0) + 1
    print("\nQueue:")
    print(json.dumps(counts, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SoveReign13 Aegis repo agent")
    parser.add_argument("--workspace", "-w", default=".", help="Repo/workspace path")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("init")

    scan = sub.add_parser("scan")
    scan.add_argument("--out-json")
    scan.add_argument("--out-md")

    plan = sub.add_parser("plan")
    plan.add_argument("--objective", default="Improve this repo without breaking existing behavior.")

    propose = sub.add_parser("propose")
    propose.add_argument("--task", required=True)
    propose.add_argument("--model", default=DEFAULT_MODEL)
    propose.add_argument("--fallback", action="store_true")

    apply = sub.add_parser("apply-patch")
    apply.add_argument("patch")
    apply.add_argument("--check-only", action="store_true")
    apply.add_argument("--backup", action="store_true", default=True)
    apply.add_argument("--proof", action="append", help="Proof command to run after patch; repeatable")

    qadd = sub.add_parser("queue-add")
    qadd.add_argument("task")

    qrun = sub.add_parser("queue-run")
    qrun.add_argument("--limit", type=int, default=1)
    qrun.add_argument("--model", default=DEFAULT_MODEL)
    qrun.add_argument("--fallback", action="store_true")
    qrun.add_argument("--sleep", type=float, default=0.0)

    sub.add_parser("status")
    return parser


def main(argv: List[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return {
        "init": cmd_init,
        "scan": cmd_scan,
        "plan": cmd_plan,
        "propose": cmd_propose,
        "apply-patch": cmd_apply_patch,
        "queue-add": cmd_queue_add,
        "queue-run": cmd_queue_run,
        "status": cmd_status,
    }[args.cmd](args)


if __name__ == "__main__":
    raise SystemExit(main())
