export class StdioServerTransport {
  async start() {
    throw new Error('Stdio transport is not available inside the remote Cloudflare MCP bundle.');
  }
}
