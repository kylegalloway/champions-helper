# ADR 0002: Use Pikalytics /ai/ Markdown endpoints for per-Pokemon build data

## Status
Accepted

## Context
Pikalytics exposes both standard HTML pages and dedicated machine-readable Markdown endpoints under `/ai/pokedex/{formatCode}` and `/ai/pokedex/{formatCode}/{speciesName}`. Pokemon-Zone is protected by Cloudflare and returns a JS challenge page to plain `fetch` requests. Pikalytics `/topteams` is client-side rendered (Handlebars templates loaded via JS); team data is not present in the server-rendered HTML.

## Decision
Use Pikalytics `/ai/pokedex/` Markdown endpoints as the primary data source for per-Pokemon usage and build statistics. Use Pikalytics tournament pages (`/tournaments/rk9/{slug}`, `/tournaments/limitless/{slug}`) for full 6-Pokemon team compositions, as these are server-rendered. Skip Pokemon-Zone scraping entirely.

SP spreads returned by the `/ai/` endpoints are already in Champions SP format (0–32 per stat, ≤66 total) — no EV conversion is needed for this source.

## Consequences
- No Playwright or headless browser required for build data.
- Full tournament team scraping requires parsing the server-rendered tournament HTML, which is more complex than Markdown parsing.
- Pokemon-Zone data is unavailable programmatically; users can still manually import teams from Pokemon-Zone via pokepast.es or paste import.
- If Pikalytics restructures their `/ai/` endpoints, the build data scraper breaks — but the format is explicitly designed for machine consumption and is unlikely to change without notice.
