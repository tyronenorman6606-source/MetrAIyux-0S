# MetrAIyux 0S · Skye Design MCP Bridge

This folder wires the copy-paste component vault into the Skye Design MCP workflow.

MCP entry page: https://skye-design-mcp.pages.dev/use-mcp.html

What is included:

- `index.html` — browser-facing MCP lab with copy buttons.
- `METRAIYUX_MCP_CONTEXT_PACKET.md` — brand and output contract for MCP runs.
- `METRAIYUX_MCP_PROMPT_PACK.md` — ready prompts for generating icons, components, React registries, and polish passes.
- `components/` — standalone MCP-shaped components.
- `snippets/METRAIYUX_MCP_ALL_IN_ONE.html` — every new MCP component in one file.
- `snippets/metraiyux-mcp-component-registry.json` — registry for future tooling.
- `skye-design-mcp-bridge.js` — tiny browser module for copying request packets and opening the MCP page.
- `skye-design-mcp.config.json` — token/config contract.

Live machine invocation note:
The provided URL resolves as a web page. I did not claim a verified machine-callable MCP endpoint from it. This package uses that page as the MCP operator entry and gives you packets that can be pasted or wired later if you expose a JSON/SSE endpoint.

Deployment:
Drop this folder with the website. Open `/mcp/` from the root navigation.
