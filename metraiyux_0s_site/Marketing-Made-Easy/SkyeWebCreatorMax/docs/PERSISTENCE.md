# Persistence

SkyeWebCreatorMax uses two persistence layers.

## Standalone Browser Storage

```txt
skyewebcreatormax.projects.v1
skyewebcreatormax.delivery.v1
```

This keeps the app useful even without a running backend. Browser storage is not live telemetry, customer visibility, a shared session log, or downstream delivery proof.

## 0S Worker Runtime Storage

```txt
/api/marketing-made-easy/webcreator-runtime/*
```

This is the live mounted runtime lane. It must be accessed through the shared FS27/SkyGate/Free99 gate and is the only place this surface should read current delivery packs, review/execution/dispatch boards, workflow timeline, and customer-visible handoff state.

## Connected Runtime Storage

```txt
skyehands_runtime_control/.skyequanta/webcreator/projects-index.json
skyehands_runtime_control/.skyequanta/webcreator/projects/<projectId>/project.json
skyehands_runtime_control/.skyequanta/webcreator/projects/<projectId>/artifacts/<artifactId>.json
skyehands_runtime_control/.skyequanta/webcreator/ae-delivery.ndjson
```

These files are local/bus proof storage, not proof of the deployed 0S Worker state.

## R2/R3 Future Hook

The bridge already records optional `r2` and `r3` artifact metadata. A production transport should upload artifact payloads to the configured bucket and preserve the same local manifest envelope.
