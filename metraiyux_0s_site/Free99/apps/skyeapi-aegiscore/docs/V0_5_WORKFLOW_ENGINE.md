# v0.5.0 code upgrade — workflow engine

v0.5.0 adds code-level product depth instead of deployment-focused work.

Implemented:

- `workflow.run` capability in `@skyeapi/core`.
- Workflow input validation with step count, step ids, and required input objects.
- Sequential workflow execution in `@skyeapi/providers` for local AegisCore Lite.
- Template interpolation using `{{input.name}}` and `{{steps.stepId.data.path}}`.
- Hosted Worker `workflow.run` execution through `/v1/call`.
- Step-level scope checks in the hosted Worker.
- Step-level plan checks in the hosted Worker.
- Step-level usage recording.
- Workflow completion/failure gateway events.
- SDK `client.workflow.run(...)` helper.
- CLI `skyeapi workflow sample` and `skyeapi workflow run --file <workflow.json> [--dry-run]`.
- Hosted CLI `skyeapi hosted workflow run --file <workflow.json> [--dry-run]`.
- MCP tool `skyeapi.workflow.run`.
- Console workflow runner with dry/live execution controls.
- Workflow smoke proof in `.proof/workflow-smoke-result.json`.

Truth boundary:

- Dry-run workflow proof validates code path, interpolation, result shape, and no secret exposure.
- Live workflow execution still requires real provider credentials and an explicit live run.
