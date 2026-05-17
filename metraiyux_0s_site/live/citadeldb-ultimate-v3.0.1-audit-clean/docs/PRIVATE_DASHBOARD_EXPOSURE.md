# Private Dashboard Exposure

Preferred options:

## Option A: SSH tunnel

```bash
ssh -L 7413:127.0.0.1:7413 user@server
```

Open:

```text
http://127.0.0.1:7413
```

## Option B: VPN

Expose dashboard only on a private interface reachable through WireGuard/Tailscale.

## Option C: Cloudflare Access / Zero Trust

Put dashboard behind Cloudflare Access or SoveReign13/Omega Skygate.

## Forbidden

Do not bind dashboard publicly without upstream auth.
