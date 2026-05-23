/* MetrAIyux 0S · Skye Design MCP Bridge
   This client opens the user's public MCP page and copies request packets.
   It does not claim a machine-callable MCP endpoint unless you wire one below. */
const SKYE_DESIGN_MCP_PAGE = "https://skye-design-mcp.pages.dev/use-mcp.html";
const METRAIYUX_MCP_DEFAULTS = {
  "void": "#04050b",
  "panel": "rgba(8,13,31,.84)",
  "gold": "#f7c95b",
  "blue": "#20b7ff",
  "cyan": "#42fff1",
  "ink": "#f7fbff",
  "muted": "#a8b6ce",
  "radius": "28px"
};

export function buildMcpRequest(task, input = '') {
  return [
    'Use the Skye Design MCP with this MetrAIyux 0S context.',
    'Task: ' + task,
    'Brand tokens: ' + JSON.stringify(METRAIYUX_MCP_DEFAULTS),
    'Rules: standalone output, scoped CSS, inline SVG, no external image dependency, no generated logo replacement.',
    input ? 'Input:
' + input : ''
  ].filter(Boolean).join('

');
}

export async function copyMcpRequest(task, input = '') {
  const packet = buildMcpRequest(task, input);
  await navigator.clipboard.writeText(packet);
  return packet;
}

export function openSkyeDesignMcp() {
  window.open(SKYE_DESIGN_MCP_PAGE, '_blank', 'noopener,noreferrer');
}
