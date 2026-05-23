# SEO + GEO Implementation Notes

This package includes a public Phoenix metro SEO/GEO layer and an crawler-friendly context layer.

## Added public ranking pages

- `/service-areas/index.html`
- `/service-areas/phoenix-az.html` — Phoenix, Arizona
- `/service-areas/glendale-az.html` — Glendale, Arizona
- `/service-areas/mesa-az.html` — Mesa, Arizona
- `/service-areas/scottsdale-az.html` — Scottsdale, Arizona
- `/service-areas/tempe-az.html` — Tempe, Arizona
- `/service-areas/chandler-az.html` — Chandler, Arizona
- `/service-areas/gilbert-az.html` — Gilbert, Arizona
- `/service-areas/peoria-az.html` — Peoria, Arizona
- `/service-areas/surprise-az.html` — Surprise, Arizona
- `/service-areas/avondale-az.html` — Avondale, Arizona

## Added crawler context files

- `/SITE_CONTEXT.md` — concise Markdown map for search and answer engines.
- `/SEARCH_ENGINE_CONTEXT.md` — fuller search-engine context and brand guardrails.

## Metadata included

Public pages include title tags, meta descriptions, canonical URLs, Open Graph tags, Twitter card tags, geo metadata, and JSON-LD for Organization/ProfessionalService/WebSite plus page-specific WebPage, Service, BreadcrumbList, and CollectionPage schema where relevant.

## Indexing controls

Public pages are indexable. Internal pages remain blocked:

- `/ae-command-hub/`
- `/operator-playbook/`
- `/.netlify/functions/`

The protected/internal folders are noindex in page metadata, blocked in robots.txt, and protected by Netlify Basic Auth placeholders in `_headers`.

## Production-domain warning

Canonical URL base is currently set to `https://solenterprises.org/`. If you deploy this build to a different domain, replace that base URL in:

- all canonical tags
- `sitemap.xml`
- `robots.txt`
- `SITE_CONTEXT.md`
- `SEARCH_ENGINE_CONTEXT.md`

## SEO reality

This package improves crawlability, clarity, local relevance, internal linking, and structured site context. It does not guarantee rankings, map pack placement, leads, revenue, or ad returns.


## Blog Content Layer
Added 12 original longform blog pages under /blog/. Each page includes unique title/description, canonical URL, BlogPosting schema, breadcrumbs, internal links to services/service areas/intake, related posts, and external links to authoritative resources where relevant.

Blog hub: https://solenterprises.org/blog/index.html


## Production hardening pass

Added public proof/trust pages, tracking setup, client portal scaffold, AE pipeline tracker, contractor upload validation, mobile navigation polish, and focused service-plus-city local pages.
