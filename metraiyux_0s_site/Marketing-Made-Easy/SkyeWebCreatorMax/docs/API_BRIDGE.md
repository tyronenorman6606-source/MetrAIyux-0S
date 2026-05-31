# API Bridge

SkyeWebCreatorMax talks to live 0S state through the shared-gated Marketing Made Easy Worker routes. Static files in this folder are route contracts only; they must not be presented as live telemetry, live sessions, customer visibility, or delivered handoff proof.

Live Worker runtime:

```txt
/api/marketing-made-easy/webcreator-runtime/*
```

Legacy/local bus proof:

```txt
skyehands_runtime_control/core/webcreator/skyewebcreator-bridge.mjs
```

## Request Project

```js
await requestWebCreatorProject({
  tenantId: 'tenant',
  workspaceId: 'workspace',
  actorId: 'user-or-agent',
  name: 'Client Website',
  brief: 'Create a polished responsive site.',
  pages: ['home', 'services', 'contact'],
  features: ['3D hero', 'AE delivery package']
});
```

Publishes:

- `webcreator.project.requested` to `skydexia`
- `ae.requested` to `ae-commandhub`

In the 0S mount, this is considered customer-visible only after the shared-gated Worker accepts and returns the delivery pack. Browser-local packages remain pending proof.

## Persist Artifact

```js
await persistGeneratedWebCreatorArtifact(projectId, {
  kind: 'website-package',
  files: ['index.html', 'styles.css', 'app.js'],
  previewUrl: '<standalone-preview-url>'
});
```

Publishes:

- `webcreator.project.generated`
- `app.generated`
- `webcreator.delivery.queued`
