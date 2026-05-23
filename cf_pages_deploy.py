#!/usr/bin/env python3
"""
Deploy a local directory to Cloudflare Pages via direct upload API.
Usage: python3 cf_pages_deploy.py <project_name> <directory>
"""

import sys, os, hashlib, mimetypes, json, base64
import urllib.request, urllib.error

CF_TOKEN   = os.environ.get("CLOUDFLARE_API_TOKEN", "")
CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "e700b92580cd05de0104128efbd3e676")
API        = "https://api.cloudflare.com/client/v4"

if not CF_TOKEN:
    raise SystemExit("Missing CLOUDFLARE_API_TOKEN. Export a local token; do not hardcode it in this file.")

HEADERS = {
    "Authorization": f"Bearer {CF_TOKEN}",
}

SKIP = {'.git', '.DS_Store', 'node_modules', '.deploy-trigger'}

def api(method, path, data=None, json_body=None, extra_headers=None):
    url = f"{API}{path}"
    body = None
    headers = dict(HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    if json_body is not None:
        body = json.dumps(json_body).encode()
        headers["Content-Type"] = "application/json"
    elif data is not None:
        body = data
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def file_hash(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def collect_files(directory):
    files = {}
    for root, dirs, names in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
        for name in names:
            if name in SKIP or name.startswith('.'):
                continue
            full = os.path.join(root, name)
            rel  = '/' + os.path.relpath(full, directory).replace('\\', '/')
            files[rel] = full
    return files

def deploy(project, directory):
    print(f"\n→ Deploying {directory} → {project}")

    files = collect_files(directory)
    print(f"  {len(files)} files collected")

    # Build manifest {path: sha256} and cache file contents
    manifest = {}
    file_data = {}
    for rel, full in files.items():
        h = file_hash(full)
        manifest[rel] = h
        file_data[h] = full

    # Step 1 — create deployment with manifest (CF Pages v4 API requires manifest upfront)
    resp = api("POST",
        f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments",
        json_body={"manifest": manifest}
    )
    if not resp.get('success'):
        print("  FAIL creating deployment:", resp.get('errors'))
        return False

    dep    = resp.get('result', {})
    dep_id = dep.get('id', '')
    jwt    = dep.get('jwt', '')
    print(f"  deployment id: {dep_id}")

    # Step 2 — find which files CF still needs
    check = api("POST",
        f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments/{dep_id}/check-missing",
        json_body=list(manifest.values())
    )
    missing = set(check.get('result') or [])
    if not missing:
        missing = set(manifest.values())  # upload all if check-missing unavailable
    print(f"  {len(missing)} files to upload")

    # Step 3 — upload missing files in batches of 20
    BATCH = 20
    items = [(h, file_data[h]) for h in missing if h in file_data]
    for i in range(0, len(items), BATCH):
        batch = items[i:i+BATCH]
        payload = []
        for h, full in batch:
            mime = mimetypes.guess_type(full)[0] or 'application/octet-stream'
            with open(full, 'rb') as f:
                content = base64.b64encode(f.read()).decode()
            payload.append({"key": h, "value": content, "metadata": {"contentType": mime}, "base64": True})

        up_headers = {"Authorization": f"Bearer {jwt}"} if jwt else {}
        up = api("POST",
            f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments/{dep_id}/upload-assets",
            json_body=payload,
            extra_headers=up_headers if jwt else None
        )
        status = "✓" if up.get('success') else f"FAIL {up.get('errors')}"
        print(f"  batch {i//BATCH+1}: {status}")

    # Step 4 — finalize deployment
    fin = api("PATCH",
        f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments/{dep_id}",
        json_body={"manifest": manifest}
    )
    if fin.get('success'):
        r = fin.get('result', {})
        print(f"  ✓ Live: {r.get('url', 'deployed')}")
        return True
    else:
        print("  FAIL finalizing:", fin.get('errors'))
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 cf_pages_deploy.py <project> <dir>")
        sys.exit(1)
    deploy(sys.argv[1], sys.argv[2])
