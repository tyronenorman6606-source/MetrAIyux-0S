# SkyeRouteX Workforce Command Layout

`SkyeRouteX` is the parent product folder for the route/workforce lane.

The v0.4.0 Workforce Command platform must stay nested here:

```text
metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/
```

The old top-level path is compatibility only:

```text
metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0 -> SkyeRouteX/workforce-command-v0.4.0
```

Do not recreate `metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0/` as a separate folder. That would split the command shell from the workforce app again.

Run this guard before shipping RouteX changes:

```bash
npm run 0s:skyeroutex:layout
```

The full RouteX proof chain also runs the layout guard first:

```bash
npm run 0s:skyeroutex:proof
```
