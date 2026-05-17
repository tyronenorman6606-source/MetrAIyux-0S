import { docs, meta } from "@/.source"
import { loader } from "fumadocs-core/source"
import { createMDXSource } from "fumadocs-mdx"
import { ThemeToggle } from "@/components/theme-toggle"
import { useMemo } from "react"
import { formatDate } from "@/lib/utils"

const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs, meta),
})

const productionSignals = [
  { label: "Live surfaces", value: "24" },
  { label: "Pages projects", value: "13" },
  { label: "Workers", value: "11" },
  { label: "HTTP checks", value: "36" },
]

const proofReceipts = [
  "Cloudflare inventory captured from source APIs",
  "SkyePay live Stripe handoff verified",
  "Reviews atlas replay recorded with browser proof",
]

interface ChangelogData {
  title: string
  date: string
  version?: string
  tags?: string[]
  body: React.ComponentType
}

interface ChangelogPage {
  url: string
  data: ChangelogData
}

export default function HomePage() {
  const sortedChangelogs = useMemo(() => {
    const allPages = source.getPages() as ChangelogPage[]
    return allPages.sort((a, b) => {
      const dateA = new Date(a.data.date).getTime()
      const dateB = new Date(b.data.date).getTime()
      return dateB - dateA
    })
  }, [])

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="max-w-5xl mx-auto relative">
          <div className="p-3 flex items-center justify-between">
            <h1 className="text-3xl font-semibold neon-gradient-text">
              Skye Production Changelog
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 lg:px-10 pt-10">
        <div className="neon-glow-panel neon-magnetic p-6 md:p-8">
          <div className="relative z-10 grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                MCP production ledger, generated May 16 2026 UTC
              </p>
              <h2 className="text-3xl font-semibold text-balance">
                I route the public production record through proof receipts,
                live routes, and operator-ready release notes.
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {productionSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-lg border border-border/70 bg-background/70 p-3"
                  >
                    <div className="text-2xl font-semibold">{signal.value}</div>
                    <div className="text-xs text-muted-foreground">
                      {signal.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <h3 className="text-sm font-semibold">Proof receipts</h3>
              <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                {proofReceipts.map((receipt) => (
                  <li key={receipt} className="flex gap-2">
                    <span className="mt-2 size-1.5 rounded-full bg-primary" />
                    <span>{receipt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-10">
        <div className="relative">
          {sortedChangelogs.map((changelog) => {
            const MDX = changelog.data.body
            const date = new Date(changelog.data.date)
            const formattedDate = formatDate(date)

            return (
              <div key={changelog.url} className="relative">
                <div className="flex flex-col md:flex-row gap-y-6">
                  <div className="md:w-48 flex-shrink-0">
                    <div className="md:sticky md:top-8 pb-10">
                      <time className="text-sm font-medium text-muted-foreground block mb-3">
                        {formattedDate}
                      </time>

                      {changelog.data.version && (
                        <div className="inline-flex relative z-10 items-center justify-center w-10 h-10 text-foreground border border-border rounded-lg text-sm font-bold">
                          {changelog.data.version}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="flex-1 md:pl-8 relative pb-10">
                    {/* Vertical timeline line */}
                    <div className="hidden md:block absolute top-2 left-0 w-px h-full bg-border">
                      {/* Timeline dot */}
                      <div className="hidden md:block absolute -translate-x-1/2 size-3 bg-primary rounded-full z-10" />
                    </div>

                    <div className="space-y-6">
                      <div className="relative z-10 flex flex-col gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-balance">
                          {changelog.data.title}
                        </h2>

                        {/* Tags */}
                        {changelog.data.tags &&
                          changelog.data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {changelog.data.tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="h-6 w-fit px-2 text-xs font-medium bg-muted text-muted-foreground rounded-full border flex items-center justify-center"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:font-semibold prose-a:no-underline prose-headings:tracking-tight prose-headings:text-balance prose-p:tracking-tight prose-p:text-balance">
                        <MDX />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
