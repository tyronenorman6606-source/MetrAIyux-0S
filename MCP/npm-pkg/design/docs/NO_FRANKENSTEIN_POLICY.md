# No-Frankenstein Composition Policy

The design MCP can combine multiple reference sources, but it must not mash them together randomly.

## What Combining Means

Combining means:

- One canonical MCP server exposes multiple clean namespaces.
- Each namespace keeps its own purpose.
- Agents choose a primary pattern first.
- Supporting elements are selected only if they reinforce that primary pattern.

Combining does not mean:

- Dumping every asset into one page.
- Mixing every style at once.
- Adding Three.js, GSAP, Motion, and every visual effect just because they are installed.
- Turning design references into a junk drawer.

## Required Selection Order

1. Product type.
2. Page purpose.
3. Primary pattern.
4. Subject type.
5. Motion language.
6. Proof layer.
7. Browser QA.

## Source Namespaces

- `skye.core` for palette, typography, layout, and high-level rules.
- `skye.motion` for Motion/GSAP/Lenis patterns.
- `skye.webgl` for Three.js/WebGL scenes.
- `skye.proof` for public trust/proof components.
- `skyesol.reference` for extracted SkyeSol assets and style references.
- `client.surface` for actual app/dashboard/tool UI.

## Hard Rule

Every generated surface must have one dominant visual logic. If two elements fight each other, remove one.
