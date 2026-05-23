# Skye Design Lab Builder Guide

This guide is for builders, operators, and advanced users extending the lab.

## Installed Stack

- React + Vite for the app shell.
- `motion` for React animation.
- `gsap` and `ScrollTrigger` for scroll choreography.
- `lenis` for smooth scroll.
- `three`, `@react-three/fiber`, and `@react-three/drei` for 3D scenes.
- `@react-three/postprocessing` for bloom/vignette/effects.
- `@theatre/core` and `@theatre/studio` for directed timelines when needed.
- `lucide-react` for icons.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```

## Folder Map

```text
skye-design-lab/
  src/
    main.tsx
    styles.css
  public/
    assets/
  registry/
    skye-spectacle-registry.json
    skye-spectacle-schema.json
    agent-directive.md
  docs/
    USER_GUIDE.md
    BUILDER_GUIDE.md
    MCP_INTEGRATION.md
```

## How To Add A New Pattern

1. Add the visual/component implementation in `src/`.
2. Add the pattern metadata to `registry/skye-spectacle-registry.json`.
3. Include composition rules and a quality gate.
4. Add user-facing notes if the pattern needs explanation.
5. Run screenshots before using it on a production site.

## Browser QA Standard

Every generated site should be checked at:

- Desktop: `1440x1000`
- Mobile: `390x844`

Confirm:

- No horizontal scroll.
- No clipped nav or label text.
- Main visual subject visible.
- H1 readable and contained.
- CTA visible without searching.
- Animations do not hide content.

## Public Copy Standard

Public-facing copy should be buyer-safe. Convert technical proof into client language.

Use:

- "Backup proof available"
- "Restore-tested handoff"
- "Private operator access"
- "Deployment receipt"
- "Authenticated buyer account"

Avoid:

- "MCP smoke proof"
- "worker debug"
- "schema bootstrap"
- "0 checks"
- "artifact not found"

## Notes On Theatre.js

Use Theatre.js for directed animation work where you need a timeline, camera marks, or art-directed 3D scenes. Keep Theatre Studio out of production bundles unless intentionally needed. The lab installs it so the tooling is available for advanced scene authoring.
