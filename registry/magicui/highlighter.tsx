import type { CSSProperties, HTMLAttributes, ReactNode } from "react"

type HighlighterAction = "highlight" | "underline"

type HighlighterProps = HTMLAttributes<HTMLSpanElement> & {
  action?: HighlighterAction
  color?: string
  children: ReactNode
}

const baseStyle: CSSProperties = {
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
  display: "inline",
}

const actionStyles: Record<HighlighterAction, CSSProperties> = {
  highlight: {
    borderRadius: "0.18em",
    padding: "0 0.12em",
    background:
      "linear-gradient(104deg, transparent 0.08em, color-mix(in srgb, var(--highlighter-color) 68%, transparent) 0.08em, color-mix(in srgb, var(--highlighter-color) 68%, transparent) calc(100% - 0.08em), transparent calc(100% - 0.08em))",
    textShadow: "0 0.08em 0.22em rgba(0, 0, 0, 0.16)",
  },
  underline: {
    textDecorationLine: "underline",
    textDecorationColor: "var(--highlighter-color)",
    textDecorationThickness: "0.16em",
    textUnderlineOffset: "0.13em",
    textDecorationSkipInk: "none",
  },
}

export function Highlighter({
  action = "highlight",
  color = "#87CEFA",
  className,
  style,
  children,
  ...props
}: HighlighterProps) {
  return (
    <span
      data-highlight={action}
      className={["magic-highlighter", className].filter(Boolean).join(" ")}
      style={{
        "--highlighter-color": color,
        ...baseStyle,
        ...actionStyles[action],
        ...style,
      } as CSSProperties}
      {...props}
    >
      {children}
    </span>
  )
}

