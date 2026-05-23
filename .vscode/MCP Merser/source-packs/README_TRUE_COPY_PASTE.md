# MetrAIyux 0S True Copy-Paste Dev Sauce

This package corrects the previous asset-room problem: copying an `<img src="/assets/...">` path is not portable when a developer wants to paste the component into another project.

## What changed

- Added `copy-paste/index.html` as the literal copy-paste vault.
- Added 52 prefixed inline SVG files in `copy-paste/icons-inline/`.
- Added 11 standalone UI components in `copy-paste/components/`.
- Added `copy-paste/snippets/METRAIYUX_COMPONENTS_ALL_IN_ONE.html` for a single paste/open file.
- Added `copy-paste/snippets/METRAIYUX_ALL_INLINE_ICONS.html` for all icons rendered inline.
- Added `copy-paste/snippets/MetrAIyuxInlineIcons.jsx` for React projects.
- Added `copy-paste/snippets/metraiyux-inline-icons.js` and `.json` for vanilla JS registries.
- Added `assets/metraiyux-copy-paste.css` for the new website route and standalone component kit.

## Practical use

Open `copy-paste/index.html`, press Copy full component, and paste into a blank `.html` file. The component includes its own scoped CSS and inline SVG. No icon asset folder is required.

## Logo

The real MetrAIyux 0S transparent logo asset remains preserved in `assets/metraiyux-0s-logo-transparent.png`. No replacement logo was generated.
