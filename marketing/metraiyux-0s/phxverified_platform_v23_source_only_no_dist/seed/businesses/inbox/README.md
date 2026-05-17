# Business Seed Inbox

Drop outside scrape exports here as `.csv` or `.json`.

On deploy, `npm run build` scans this folder recursively, normalizes the new listings, dedupes them against the core seed, and publishes them into `dist/data/businesses.json` plus generated pages.

Keep disabled or old batches in an `archive/` or `disabled/` folder. Those folder names are ignored by the builder.
