# Merser3.1 World Directive

Merser3.1 starts from the shipped Merser source, but the next base is not allowed to keep the old flat-room feel.

## Camera And Viewport

- Scenes must start zoomed out enough that the user understands the whole universe before inspecting details.
- Scroll should move the user into the world, not just move a flat page past the viewport.
- The opening camera should reveal the universe at a distance, then shift scale, parallax depth, room layers, and active surfaces as the user scrolls.
- Zoom controls must have useful room in both directions: the initial view cannot be so close that zoom-in feels blocked.

## Dimensional Room Rules

- A med spa, barber room, gym, or tattoo studio is not a flat wall set. It is a universe made of modular surfaces.
- Walls become dimensional service surfaces, proof surfaces, booking surfaces, source surfaces, lighting fields, and route portals.
- Components should exist as whole spatial objects: floating treatment cards, product planets, consult gates, proof panes, source-room screens, and orbiting route rails.
- Each surface needs a purpose and a state change: dormant, revealed, focused, inspected, converted, or routed.

## Scroll Reveal

- Scroll depth should reveal new dimensions in sequence:
  1. Universe silhouette and main room anchor.
  2. Service surfaces and route rails.
  3. Proof surfaces and source-pack screens.
  4. Conversion/booking gate.
  5. Operator/MCP receipt layer.
- Reveals must be spatial, not just opacity fades. Surfaces should slide, orbit, unfold, rotate, or scale from world positions.

## Interaction

- Drag must move the world or orbit the user's point of view.
- Minimap movement should feel like moving through the universe, not dragging a dot on a UI diagram.
- The source preview should be part of the universe as a screen/surface, not a detached card.
- Mobile must keep the same zoom-out/enter/inspect behavior with smaller controls and fewer simultaneous particles.

## Guardrail

Do not mutate the shipped Merser release to test these ideas. Build them here first, in `.vscode/MCP5-Merser3.1`, then proof the base before any deploy or npm publish.
