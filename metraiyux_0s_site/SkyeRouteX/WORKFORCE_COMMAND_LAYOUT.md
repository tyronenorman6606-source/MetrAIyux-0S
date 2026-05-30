# SkyeRouteX Workforce Command Layout

`SkyeRouteX` is the parent product folder for the route/workforce lane.

The v0.4.0 Workforce Command platform must stay nested here:

```text
metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/
```

The old top-level path has been removed from the deployed site tree:

```text
metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0/  # must not exist
```

The five old generated artifacts that existed only in the stale root copy are archived in the canonical app:

```text
metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/data/legacy-root-quarantine-2026-05-20/
```

Do not recreate a root-level v0.4.0 RouteX folder inside `metraiyux_0s_site`. That would split the landing routes from the workforce app again and reintroduce a deployable duplicate.

Run this guard before shipping RouteX changes:

```bash
npm run 0s:skyeroutex:layout
```

The full RouteX proof chain also runs the layout guard first:

```bash
npm run 0s:skyeroutex:proof
```
