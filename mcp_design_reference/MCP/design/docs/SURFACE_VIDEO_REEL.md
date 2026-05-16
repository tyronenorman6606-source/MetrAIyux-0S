# Actual E2E Surface Video Reel

When the user says the app does something, proof must show the browser doing that thing. A static landing-page screenshot is not proof of signup, auth, routing, restore, filtering, deployment, monitoring, checkout, or any other workflow.

## Required Workflow

1. Name the exact claim being proven: signup, auth, routing, dashboard state, restore, deploy, monitor, filter, or handoff.
2. Start the real app/site locally.
3. Use Playwright to drive the browser through that claim with `page.goto`, `page.click`, `page.fill`, `page.mouse.wheel`, `page.keyboard`, or the relevant workflow actions.
4. Record the browser with Playwright `recordVideo` or capture a dense action frame sequence.
5. If needed, encode the action capture to MP4/WebM with `ffmpeg`.
6. Put the action reel in the proof stage when the live surface is the proof.
7. Use `autoplay muted loop playsinline preload="auto"` with a real poster image for ambient proof, or `controls` for user-driven proof.
8. Keep still screenshots as secondary receipts only, not the primary proof of an app behavior claim.
9. Add captions that name the actual workflow being shown.
10. Run browser E2E and verify the video is visible, loaded, and playing.

## Playwright Baseline

Record the actual workflow, not just the first page.

```js
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: 'test-artifacts/proof-video', size: { width: 1440, height: 1000 } }
});
const page = await context.newPage();
await page.goto('http://localhost:4344/');
await page.click('[data-proof-route]');
await page.fill('[name="email"]', 'proof@example.com');
await page.mouse.wheel(0, 900);
await page.waitForSelector('[data-proof-state="complete"]');
await context.close();
```

## FFmpeg Baseline

Use the browser action recording directly when possible. If the capture is a frame sequence, crop it to a stable aspect ratio, encode H.264, and move the MP4 metadata to the front:

```bash
ffmpeg -y \
  -loop 1 -t 3 -i screen-01.png \
  -loop 1 -t 3 -i screen-02.png \
  -filter_complex "[0:v]scale=1440:900:force_original_aspect_ratio=increase,crop=1440:900,setsar=1[v0];[1:v]scale=1440:900:force_original_aspect_ratio=increase,crop=1440:900,setsar=1[v1];[v0][v1]xfade=transition=fade:duration=0.6:offset=2.4,format=yuv420p[out]" \
  -map "[out]" -r 30 -c:v libx264 -pix_fmt yuv420p -movflags +faststart surface-reel.mp4
```

## Browser Proof

The final report must verify:

- First main subject is the workflow video proof stage.
- Video source points at the generated browser-action reel.
- The proof report names the action path that was recorded.
- `readyState >= 2`.
- `currentTime > 0`.
- `paused === false` for muted autoplay.
- The video is visible in viewport.
- No horizontal scroll on mobile.
- Desktop and mobile screenshots were captured after the reel rendered.
- `design_e2e_proof_audit` passes for any workflow claim.

## Reject

- Stock imagery when real screens exist.
- Fake UI when actual app screenshots exist.
- Static screenshot-only proof for app behavior claims.
- CSS-only "animated video" claims when Playwright and ffmpeg can generate a real browser-action reel.
- A headline-first hero when the user asked to lead with the actual surface.
