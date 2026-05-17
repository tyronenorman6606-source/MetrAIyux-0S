# Over3arth Globe Integration

The app now includes a local Magic UI style globe implementation at:

```jsx
import { Globe } from '@/registry/magicui/globe';
```

## Files added

- `src/registry/magicui/globe.jsx` — reusable animated globe component.
- `src/components/WorldGlobePanel.jsx` — Over3arth dashboard panel that wraps the globe with world stats.
- `vite.config.js` — adds the `@` alias so the import path works.

## Where it appears

The dashboard World Command view now renders the globe as a foreground world construct. It shows the user’s active world name, reality charge, active realms/goals, and completed proof count.

## Behavior

- Canvas-based globe animation with glowing land points, orbit rings, scanline, and responsive resizing.
- Honors `prefers-reduced-motion` by rendering a static globe instead of continuously animating.
- No external Magic UI package is required; the registry import is local and drop-safe.
