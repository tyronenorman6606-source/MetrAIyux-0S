# SkyeVault Pro · Hosted Family Upgrade

This version keeps the offline-first personal vault, but adds a lighter hosted layer for subscriptions and member recovery.

## What changed

- Page-wide drag and drop for files, folders, and zip archives
- Zip unpacking straight into the vault when JSZip is available
- Stronger SkyeDocx branding with your logo visible in the editor shell
- Hosted AI helper through a Netlify Function that reads `OPENAI_API_KEY` from Netlify environment variables
- Optional hosted vault backup through Netlify Blobs
- Optional hosted member profile sync through Neon when `DATABASE_URL` is configured, with a Blobs fallback if it is not
- Optional Netlify Identity widget hooks for signup/login

## Deploy notes

1. Push or upload the repo to Netlify.
2. Set these environment variables in Netlify:
   - `OPENAI_API_KEY` for the AI helper Function
   - `OPENAI_MODEL` optional, defaults to `gpt-5`
   - `DATABASE_URL` optional, for Neon-backed member profiles
3. Netlify Functions are configured in `netlify.toml`.
4. Hosted backup and hosted profile sync wake up when the site is deployed with Functions.

## Important reality notes

- Local vault storage still lives in IndexedDB first.
- Hosted backup is optional and account-bound.
- Netlify Identity is wired as an option because you asked for it, but Netlify has deprecated Identity for new setups. If you want the clean long-term grown-up path, swap auth later to Auth0, Clerk, or Supabase Auth.
- The app still works without hosted auth: offline storage, thumb-drive sync, and local editing remain available.

## Subscription angle

The membership profile form now stores a plan tier so you can map:

- Core → 256GB annual thumb drive
- Flow → 512GB annual thumb drive
- Pro → 1TB annual thumb drive

That is metadata and workflow support, not shipping automation. The app remembers the tier and hosted profile state, but it does not buy postage by sorcery.


## Founder page

A founder editorial page is available at `/founder/index.html` and linked from the home, vault, and SkyeDocx surfaces.
