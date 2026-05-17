# Over3arth

Over3arth is a phone-first interactive world-building app for turning real-life goals into realms, daily rituals, affirmations, quests, notes, weekly reviews, reality contracts, and a proof ledger.

The product language is mythic. The mechanics stay practical: intention becomes a goal, the goal becomes an if-then plan, the plan becomes a quest, and the quest becomes evidence.

## Current version

v1.6.0 — Reality Anchors, World Codex, Reality Forecast, environment-design loops, snapshot cleanup, and product polish on top of the v1.4 focus/intelligence layer.

## What is included

- Vite + React app
- Three.js animated world/orb background
- Local Magic UI style globe at `src/registry/magicui/globe.jsx`
- Framer Motion page and interaction animation
- PWA manifest, icons, service worker, and Netlify routing
- Local-first persistence through `localStorage`
- Onboarding / World Genesis
- Archetype selection
- Realm-based goal builder
- WOOP-style goal fields: desired outcome, obstacle, if-then plan
- World Blueprint packs
- Manual quest creation with due dates, difficulty, and evidence targets
- Daily power ritual
- Ritual reminder preference storage and browser permission request handling
- Affirmation forge
- Quest/proof engine
- Reality Anchors, World Codex for cue-action-reward environment loops
- Reality Forecast dashboard with consistency, anchor grid, and proof archive meters
- Focus Chamber with timer, focus templates, session history, and optional proof quest creation
- World Intelligence next-command system
- Seven-day momentum strip
- Notes / reality ledger
- Weekly Ascension Review
- Realm Intelligence scoring
- Reality Contracts
- Streak Recovery Rite logic
- Ascension Card text export/copy system
- Local monetization lane signals without fake billing
- Export/import JSON backup
- Local snapshot vault with manual and daily automatic restore points
- Runtime error boundary
- Analytics hooks through `CustomEvent`, `dataLayer`, and `gtag` when present
- Deployment command center documentation

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Deploy to Netlify

This app is ready for Git-connected Netlify deployment.

```bash
npm install
npm run build
```

Netlify settings:

```txt
Build command: npm run build
Publish directory: dist
Node version: 20
```

The included `netlify.toml` already sets these defaults.

## Data model

Over3arth stores everything locally in the browser under:

```txt
over3arth-state-v1
```

Users can export/import JSON from the Ledger page. The v1.6 schema is version 6 and migrates older local worlds into the current local shape. The local snapshot vault is browser-local and should be treated as a convenience restore layer, not a cloud backup.


## v1.6 product layer

This package adds:

- Reality Anchors, World Codex page for cue, action, environment, friction reducer, and reward loops
- Anchor templates: Morning Command Anchor, Wealth First Move, Body Reset Gate, and Shutdown Oracle
- Anchor-to-quest conversion so a behavior cue can become a same-day proof move
- Anchor Grid Strength scoring and environment alignment meter
- Reality Forecast dashboard panel with consistency field, anchor grid, proof archive, and weakest-realm command
- Schema v6 normalization for local `anchors`
- Snapshot vault display now includes anchor counts
- Duplicate snapshot restore control removed
- Duplicate Ascension Card level line removed

## v1.4 product layer

This package adds:

- Focus Chamber with reusable protocols, timer controls, session history, and focus XP
- Optional conversion from completed focus sessions into proof quests
- World Intelligence dashboard panel that recommends the next best command
- Seven-day momentum strip for recent charge history
- Local snapshot vault with manual snapshots, daily automatic snapshots, restore controls, and vault clearing
- Reality Contracts with vow, daily proof, evidence standard, boundary, reward, and review date
- Contract templates: 13-Day Spark Contract, 30-Day Ascension Arc, and 7-Day Energy Cleanse
- Contract-generated proof quests
- Contract completion XP and ledger entries
- Recovery Rite detection for missed rhythm windows
- Ascension Card generation as a downloadable and copyable text artifact
- Local launch-lane plan cards for Forge, Ascendant, and Sovereign
- Local plan interest signals without payment collection
- Schema v5 normalization for contracts, recovery rites, share cards, launch signals, focus sessions, and focus preferences

## Magic Globe layer

Over3arth includes a local Magic UI style globe at `src/registry/magicui/globe.jsx`, imported with:

```jsx
import { Globe } from '@/registry/magicui/globe';
```

The dashboard uses it through `src/components/WorldGlobePanel.jsx` as the user’s active world construct. The component is local, responsive, animated, and does not require adding a separate Magic UI package.

## Research basis

The app is designed around these patterns:

- Values-based affirmations rather than empty hype
- Implementation intentions: if obstacle happens, then action follows
- Mental contrasting: desired future plus predictable obstacle
- Self-determination: autonomy, competence, and identity-aligned action
- Expressive writing / journaling
- Flow-friendly quest design: clear goals, immediate feedback, manageable challenge
- Streak recovery without shame loops

## Safety posture

Over3arth uses mythic language as a motivational interface. It should not promise supernatural control over reality, guaranteed outcomes, medical treatment, or mental-health cures. The correct positioning is: users shape their lived reality through attention, values, environment, repeated behavior, reflection, and proof.

## Suggested next upgrades

- Account system and encrypted cloud sync
- IndexedDB storage for larger journals and offline resilience
- AI-assisted affirmation, ritual, and review generation
- Real push notifications with a backend scheduler
- Stripe, Lemon Squeezy, Polar, or first-party billing integration
- Social circles / covenants
- Coach/operator dashboard
- End-to-end encrypted private journal mode

## Proof

The current v1.6 package passed:

```bash
npm install
npm run lint
npm run build
npm run preview -- --port 4174
curl -I http://127.0.0.1:4174/
curl http://127.0.0.1:4174/manifest.webmanifest
curl http://127.0.0.1:4174/sw.js
```

The only build note is the expected Vite >500 KB warning for the lazy-loaded Three.js visual chunk. That warning is not a failed build.
