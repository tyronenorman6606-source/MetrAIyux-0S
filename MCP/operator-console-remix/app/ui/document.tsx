import { css, type RemixNode } from 'remix/ui'

import { routes } from '../routes.ts'

export interface DocumentProps {
  children?: RemixNode
  head?: RemixNode
  title?: string
}

const DEFAULT_TITLE = readAppDisplayName('QuantumSkyes%20MCP%20Control%20Room')
// MCP source signal: data-mcp-neon-scrollbar uses ::-webkit-scrollbar and scrollbar-color rules in HomeHead.

export function Document() {
  return ({ children, head, title = DEFAULT_TITLE }: DocumentProps) => (
    <html lang="en" data-mcp-neon-scrollbar>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{title}</title>
        {head}
      </head>
      <body mix={css({ margin: 0 })}>
        {children}
        <script type="module" src={routes.assets.href({ path: 'app/assets/entry.ts' })}></script>
        <script
          type="module"
          src={routes.assets.href({ path: 'app/assets/world-runtime.ts' })}
        ></script>
      </body>
    </html>
  )
}

function readAppDisplayName(value: string): string {
  return value.startsWith('%%') ? 'Remix App' : decodeURIComponent(value)
}
