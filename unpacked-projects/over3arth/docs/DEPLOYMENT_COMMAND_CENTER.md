# Over3arth Deployment Command Center

This is the operator deployment file. Do not paste this content into public/client-facing app screens.

## 1. Local proof

```bash
npm install
npm run dev
```

Open the local Vite URL and verify:

- Onboarding loads
- Archetype selection works
- Begin Genesis creates starter world
- Navigation changes pages
- Goal creation works
- Quest completion increases proof ledger
- Ritual save works
- Affirmation generation and save works
- Notes save works
- Export JSON downloads a file
- Import JSON restores state

## 2. Production build proof

```bash
npm run build
npm run preview
```

Verify the same flows in preview mode.

## 3. Netlify deployment

Use Git-connected deployment for production.

Expected settings:

```txt
Build command: npm run build
Publish directory: dist
Node version: 20
```

`netlify.toml` already contains:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 4. Post-deploy smoke

After deployment:

- Load homepage
- Complete onboarding
- Refresh page and confirm data persisted
- Create one new goal
- Generate one quest
- Complete one quest
- Save one ritual
- Save one note
- Generate and save one affirmation
- Export JSON
- Reset world
- Import JSON

## 5. Provider status

No live provider keys are required for the current build. This is a local-first PWA. Future AI/provider upgrades can be added without breaking the local engine.

## 6. Future environment variables

Reserved names for future AI upgrade:

```txt
VITE_OVER3ARTH_AI_MODE=local|server
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Do not add fake AI success states. If no live provider key is present, the app should clearly use the local affirmation engine.

## v1.2.0 hardening checks

Run these before deploying:

```bash
npm install
npm run lint
npm run build
npm run preview -- --host 0.0.0.0
```

Manual phone-first checks:

✅ Install prompt / add-to-home-screen metadata appears on supported devices.
✅ All bottom navigation items open: World, Realms, Quests, Ritual, Affirm, Notes, Ledger.
✅ Low power mode toggles the heavy visual field off.
✅ Export downloads JSON.
✅ Import rejects non-Over3arth JSON and accepts a valid Over3arth export.
✅ Reset asks for confirmation.
✅ Refreshing the app preserves the local world.
✅ Direct route refresh falls back to the app shell on Netlify.


## Manual v1.2 flow checks

✅ Activate each Blueprint pack and confirm goals plus first quests appear.
✅ Create a manual quest with due date, difficulty, and evidence target.
✅ Complete a manual quest and confirm the proof ledger updates.
✅ Save ritual reminder time and confirm settings persist after refresh.
✅ Request browser notification permission and confirm permission state is recorded.
✅ Save a weekly Ascension Review and confirm Review Archive updates.
✅ Confirm Realm Intelligence scores respond to proofs and notes.
✅ Export/import JSON and confirm reviews/settings survive migration.

Reminder truth check: current build stores reminder preference and browser permission only. Do not claim background scheduled push reminders until a backend scheduler or Web Push service is connected and proven.

## v1.6.0 retention / launch checks

Run these before deploying the v1.6 package:

```bash
npm install
npm run lint
npm run build
npm run preview -- --port 4174
```

Manual checks:

✅ Complete onboarding and confirm starter goals/quests appear.
✅ Open Focus and Ascend pages from side nav and bottom nav.
✅ Start, pause, reset, and seal a Focus Chamber session.
✅ Seal a focus session with proof quest creation and confirm the quest appears.
✅ Save a manual snapshot, restore it, and confirm the ledger records the restore.
✅ Apply each Reality Contract template and confirm the form fills.
✅ Seal a Reality Contract and confirm a contract proof quest appears.
✅ Complete the generated proof quest and confirm ledger updates.
✅ Complete the contract and confirm it archives.
✅ Generate an Ascension Card and confirm a text file downloads.
✅ Confirm copied/downloaded Ascension Card contains world name, level, charge, proofs, and next command.
✅ Select each plan lane and confirm the selected lane is stored locally.
✅ Confirm the UI clearly says plan lanes do not collect payment.
✅ Export JSON and confirm contracts, recoveryRites, shareCards, launchSignals, settings, and reviews are included.
✅ Import the JSON and confirm v1.6 state survives normalization.
✅ Confirm manifest says Over3arth v1.6.
✅ Confirm service worker cache version is `over3arth-v1.6.0`.

Truth check: v1.6 adds launch/monetization readiness and Reality Anchors but no billing provider. Do not claim payments, subscriptions, auth, sync, or backend push are live until those integrations are implemented and proven.


## v1.6 Reality Anchors smoke

- Open the Anchors tab.
- Apply each anchor template into the form.
- Save at least one anchor.
- Convert that anchor into a quest.
- Complete the generated quest from the Quests tab.
- Return to the dashboard and confirm Reality Forecast + Anchor Grid Strength changed.
- Export JSON from the Ledger and confirm `anchors` is present.

