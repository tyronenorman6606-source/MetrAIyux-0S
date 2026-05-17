#!/usr/bin/env python3
"""
Deploy a local directory to Cloudflare Pages via direct upload API.
Usage: python3 cf_pages_deploy.py <project_name> <directory>
"""

import sys, os, hashlib, mimetypes, json, base64
import urllib.request, urllib.error

CF_TOKEN   = "cfat_MaP6YebiiwtqWwdkYcGYbjjXPwZricYs24gFSo9N9e24460f"
CF_ACCOUNT = "e700b92580cd05de0104128efbd3e676"
API        = "https://api.cloudflare.com/client/v4"

HEADERS = {
    "Authorization": f"Bearer {CF_TOKEN}",
}

SKIP = {'.git', '.DS_Store', 'node_modules', '.deploy-trigger'}

def api(method, path, data=None, json_body=None):
    url = f"{API}{path}"
    body = None
    headers = dict(HEADERS)
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

def build_multipart(fields, boundary):
    parts = []
    for name, (filename, content, mime) in fields.items():
        parts.append(
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
            f'Content-Type: {mime}\r\n\r\n'.encode()
        )
        parts.append(content if isinstance(content, bytes) else content.encode())
        parts.append(b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    return b''.join(p if isinstance(p, bytes) else p.encode() for p in parts)

def deploy(project, directory):
    print(f"\n→ Deploying {directory} → {project}")

    files = collect_files(directory)
    print(f"  {len(files)} files collected")

    # Step 1 — get upload URL (new deployment slot)
    resp = api("POST", f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments")
    if not resp.get('success'):
        # Try the upload endpoint instead
        resp = api("POST", f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/uploads")
        if not resp.get('success'):
            print("  FAIL creating deployment:", resp.get('errors'))
            return False

    dep = resp.get('result', {})
    upload_url = dep.get('upload_url') or dep.get('jwt')
    dep_id = dep.get('id', '')
    print(f"  deployment id: {dep_id}")
    print(f"  upload_url present: {bool(upload_url)}")

    # Step 2 — upload files in batches using the JWT-based upload endpoint
    # CF Pages uses: POST /pages/assets/upload with JWT auth
    jwt = upload_url or dep.get('jwt')

    if not jwt:
        print("  No upload JWT — trying manifest-based upload")
        # Build manifest: {file_path: sha256_hash}
        manifest = {}
        file_data = {}
        for rel, full in files.items():
            h = file_hash(full)
            manifest[rel] = h
            file_data[h] = full

        # Check which files CF needs
        check_resp = api("POST",
            f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments/{dep_id}/check-missing",
            json_body=list(manifest.values())
        )
        missing_hashes = set(check_resp.get('result') or manifest.values())
        print(f"  {len(missing_hashes)} files need uploading")

        # Upload missing files
        BATCH = 20
        hash_to_rel = {v: k for k, v in manifest.items()}
        missing_files = {h: file_data[h] for h in missing_hashes if h in file_data}

        items = list(missing_files.items())
        for i in range(0, len(items), BATCH):
            batch = items[i:i+BATCH]
            fields = {}
            for h, full in batch:
                mime = mimetypes.guess_type(full)[0] or 'application/octet-stream'
                with open(full, 'rb') as f:
                    content = f.read()
                encoded = base64.b64encode(content).decode()
                fields[h] = encoded

            up = api("POST",
                f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments/{dep_id}/upload-assets",
                json_body=fields
            )
            if not up.get('success'):
                print(f"  FAIL uploading batch {i//BATCH+1}:", up.get('errors'))

        # Finalize
        fin = api("PATCH",
            f"/accounts/{CF_ACCOUNT}/pages/projects/{project}/deployments/{dep_id}",
            json_body={"manifest": manifest}
        )
        if fin.get('success'):
            r = fin.get('result', {})
            print(f"  ✓ Deployed: {r.get('url', 'ok')}")
            return True
        else:
            print("  FAIL finalizing:", fin.get('errors'))
            return False

    return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 cf_pages_deploy.py <project> <dir>")
        sys.exit(1)
    deploy(sys.argv[1], sys.argv[2])
