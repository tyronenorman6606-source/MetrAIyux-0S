# MCP Integration Notes

This folder is designed to become a clean source for MCP-assisted design generation without polluting the existing `MCP/` folder.

## Recommended Integration

Expose these files as read-only resources to your MCP server:

- `skye-design-lab/registry/skye-spectacle-registry.json`
- `skye-design-lab/registry/agent-directive.md`
- `skye-design-lab/docs/USER_GUIDE.md`
- `skyesol_spectacle_reference/notes/spectacle-style-system.md`
- `skyesol_spectacle_reference/assets/`

## Agent Workflow

1. Read `agent-directive.md`.
2. Pick one pattern from `skye-spectacle-registry.json`.
3. Pull typography, palette, and motion cues from `spectacle-style-system.md`.
4. Generate the site.
5. Run browser screenshots.
6. Fix visual problems before deploy.

## Do Not Pollute The MCP Folder

Keep generated database proof, smoke output, auth logs, and deploy artifacts out of the design reference resources.

Good design resources:

- style notes
- pattern registry
- approved screenshots
- component examples
- asset references

Bad design resources:

- build logs
- smoke test output
- customer records
- API keys
- raw database proof
- deployment secrets

## MCP Resource Names

Recommended resource names:

- `skye.design.registry`
- `skye.design.directive`
- `skye.design.user-guide`
- `skye.reference.style-system`
- `skye.reference.assets`

## Future Upgrade

Once the MCP server has a package manifest or registry loader, add a small endpoint/tool that returns:

- approved pattern list
- forbidden patterns
- required browser QA checklist
- public-copy safety rules
- asset manifest
