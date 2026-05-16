#!/usr/bin/env python3
"""SoveReign13 Reliquary workspace backup utility."""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, subprocess, sys, tarfile
from pathlib import Path

EXCLUDES = {'.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', 'target', '.s13/reliquary'}

def now_id() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def should_exclude(rel: str) -> bool:
    return any(rel == ex or rel.startswith(ex + '/') for ex in EXCLUDES)

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def backup(args: argparse.Namespace) -> int:
    workspace = Path(args.workspace).expanduser().resolve()
    if not workspace.is_dir():
        raise SystemExit(f'Workspace not found: {workspace}')
    out_dir = Path(args.out_dir).expanduser().resolve() if args.out_dir else workspace / '.s13' / 'reliquary'
    out_dir.mkdir(parents=True, exist_ok=True)
    name = args.name or f'{workspace.name}-reliquary-{now_id()}'
    tar_path = out_dir / f'{name}.tar.gz'
    manifest = {'created_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'), 'workspace': str(workspace), 'archive': str(tar_path), 'files': []}
    with tarfile.open(tar_path, 'w:gz') as tar:
        for path in workspace.rglob('*'):
            if not path.is_file():
                continue
            r = str(path.relative_to(workspace)).replace(os.sep, '/')
            if should_exclude(r):
                continue
            tar.add(path, arcname=r)
            try:
                manifest['files'].append({'path': r, 'bytes': path.stat().st_size})
            except OSError:
                pass
    manifest['sha256'] = sha256(tar_path)
    manifest_path = out_dir / f'{name}.manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'✅ Reliquary archive: {tar_path}')
    print(f'✅ Manifest: {manifest_path}')
    print(f'✅ SHA256: {manifest["sha256"]}')
    return 0

def list_archives(args: argparse.Namespace) -> int:
    base = Path(args.path).expanduser().resolve()
    for manifest in sorted(base.glob('*.manifest.json')):
        data = json.loads(manifest.read_text(encoding='utf-8'))
        print(f"{manifest.name}\n  archive: {data.get('archive')}\n  sha256:  {data.get('sha256')}\n  files:   {len(data.get('files', []))}")
    return 0

def verify(args: argparse.Namespace) -> int:
    manifest = Path(args.manifest).expanduser().resolve()
    data = json.loads(manifest.read_text(encoding='utf-8'))
    archive = Path(data['archive'])
    actual = sha256(archive)
    if actual != data.get('sha256'):
        raise SystemExit(f'SHA256 mismatch. expected={data.get("sha256")} actual={actual}')
    print(f'✅ Archive verified: {archive}')
    return 0

def main() -> int:
    parser = argparse.ArgumentParser(description='SoveReign13 Reliquary backup utility')
    sub = parser.add_subparsers(dest='cmd', required=True)
    b = sub.add_parser('backup')
    b.add_argument('--workspace', '-w', default='.')
    b.add_argument('--out-dir')
    b.add_argument('--name')
    l = sub.add_parser('list')
    l.add_argument('path', nargs='?', default='.s13/reliquary')
    v = sub.add_parser('verify')
    v.add_argument('manifest')
    args = parser.parse_args()
    return {'backup': backup, 'list': list_archives, 'verify': verify}[args.cmd](args)

if __name__ == '__main__':
    raise SystemExit(main())
