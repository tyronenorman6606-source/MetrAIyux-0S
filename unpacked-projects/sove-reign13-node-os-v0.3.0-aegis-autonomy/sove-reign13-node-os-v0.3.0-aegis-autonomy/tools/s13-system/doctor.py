#!/usr/bin/env python3
"""SoveReign13 system doctor."""
from __future__ import annotations
import json, os, shutil, socket, subprocess, time, urllib.request

CHECKS = [
    ('git', ['git', '--version']), ('nix', ['nix', '--version']), ('docker', ['docker', '--version']),
    ('podman', ['podman', '--version']), ('ollama', ['ollama', '--version']), ('python3', ['python3', '--version']),
    ('node', ['node', '--version']), ('wrangler', ['wrangler', '--version'])
]
URLS = [('ollama', 'http://127.0.0.1:11434/api/tags'), ('orynth-router', 'http://127.0.0.1:13131/health'), ('command-center', 'http://127.0.0.1:1313')]

def cmd_ok(cmd):
    try:
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        return {'ok': p.returncode == 0, 'stdout': (p.stdout or p.stderr).strip().splitlines()[:3]}
    except Exception as exc:
        return {'ok': False, 'error': str(exc)}

def url_ok(url):
    try:
        with urllib.request.urlopen(url, timeout=5) as r:  # local/operator URLs
            return {'ok': 200 <= r.status < 400, 'status': r.status}
    except Exception as exc:
        return {'ok': False, 'error': str(exc)}

def main():
    payload = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'hostname': socket.gethostname(), 'commands': {}, 'services': {}}
    for name, cmd in CHECKS:
        payload['commands'][name] = cmd_ok(cmd) if shutil.which(cmd[0]) else {'ok': False, 'error': 'not found'}
    for name, url in URLS:
        payload['services'][name] = url_ok(url)
    print(json.dumps(payload, indent=2))

if __name__ == '__main__':
    main()
