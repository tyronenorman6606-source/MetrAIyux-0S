# Still2Vid Forge Free99 Usage

Updated: 2026-05-20

Still2Vid Forge v4 is mounted at:

```text
/Free99/apps/still2vid-forge/index.html
```

It is free to use, but it is still gate-owned. Users must enter through the 0S/FS27 gate so the company captures the email/session before app use.

## What it does

- Loads a real image/logo/still in the browser.
- Repairs the image with canvas filters and generated fix variants.
- Adds motion presets, overlay/logo layers, optional text, and optional audio.
- Exports PNG, sprite sheet, frame ZIP, or browser-recorded video.
- Keeps source media local to the browser.

## Real-source rule

The app blocks export until a real source image is loaded. Valid sources are:

- uploaded real client image/logo
- harvested live-surface media
- open-source/licensed media
- AI-generated image with receipt

Fake initials and plain text-logo placeholders are not valid client identity sources.

## App-to-app handoff

Client App Factory and SkyeWebCreatorMax pass media through:

```text
METRAIYUX_MEDIA_HANDOFF
```

Still2Vid reads that handoff on boot, loads the image when provided, keeps the return URL, and lets the operator go back to the calling app.
