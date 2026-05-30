#!/usr/bin/env python3
"""
Compatibility wrapper for the repo's current Cloudflare Pages direct-upload lane.

Usage:
  CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... python3 cf_pages_deploy.py <project_name> <directory>

The real uploader lives in tools/cloudflare-pages-direct-upload.mjs because the
current Pages API requires the upload-token/assets/manifest multipart flow.
"""

import os
import subprocess
import sys


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: python3 cf_pages_deploy.py <project> <dir>")
        return 2

    project, directory = sys.argv[1], sys.argv[2]
    env = os.environ.copy()
    env.setdefault("PAGES_PROJECT", project)
    env.setdefault("PAGES_DIR", directory)
    env.setdefault("PAGES_BRANCH", "main")
    env.setdefault("PAGES_COMMIT_MESSAGE", f"Direct upload {project}")

    return subprocess.call(["node", "tools/cloudflare-pages-direct-upload.mjs"], env=env)


if __name__ == "__main__":
    raise SystemExit(main())
