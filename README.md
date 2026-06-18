# Champions Helper

A team-building assistant for Pokemon Champions Ranked Doubles. Tracks your roster, imports competitive meta teams, and calculates the VP cost to retrain any of your Pokemon to match a given meta build.

## What it does

- **Roster management** — store your owned Pokemon with their current builds (moves, ability, nature, SP spread); search and paginate entries; autocomplete via `@pkmn/dex`
- **Meta team import** — scrape team data from Pikalytics tournament pages, pokepast.es, or Showdown paste; tagged by Regulation; captures player name and record
- **Team matching** — for any meta team slot, compare every Roster Entry of that species and classify the match:
  - **Exact** — already matches; 0 VP to retrain
  - **Adjustable** — reachable by spending VP; shows the calculated cost breakdown; VP cost updates live when switching alternates
  - **Unowned** — not in your roster (may still be in Pokemon Home)
- **Legality checking** — seed regulation species from Serebii; teams show LEGAL/ILLEGAL badge when a regulation filter is active
- **Teams I can build** — "Owned all 6" filter + "Sort by VP cost" surfaces buildable teams sorted by cheapest-to-retrain first
- **Sprites** — Pokemon sprites from the Showdown CDN displayed throughout (RosterCard, BuildCard, MetaTeamCard slot chips)
- **Delete teams** — remove any imported meta team with one click

## Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| Backend | Hono (runs in Bun) |
| Database | SQLite via Drizzle ORM (bun:sqlite) |
| Reference data | `@pkmn/dex` (Showdown data) |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.2

## Setup

```bash
bun install
```

Migrations run automatically when the server starts (via `drizzle-orm/bun-sqlite/migrator`). Regulations M-A, M-B, and M-C are seeded on first boot.

To seed your roster from the existing Excel export:

```bash
bun run migrate:excel
```

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Start Hono server (watch mode) + Vite dev server concurrently |
| `bun run build` | Production Vite build |
| `bun run start` | Run the production server |
| `bun run scrape` | Scrape Pikalytics / Serebii and populate meta teams |
| `bun run migrate:excel` | Import roster from `Pokemon Champions.xlsx` |
| `bun run db:generate` | Generate a new Drizzle migration after schema changes |

> **Note**: `drizzle-kit migrate` requires `better-sqlite3` and won't work with this project's `bun:sqlite` driver. Migrations are applied automatically on server start instead.

## VS Code

Tasks and launch configurations are provided in `.vscode/`.

**Tasks** (`Ctrl+Shift+B` / `Cmd+Shift+B`):
- `Dev (server + client)` — starts Hono + Vite together
- `Build` — production build
- `Scrape`, `Migrate Excel`, `DB Generate`

**Launch configurations** (Run & Debug panel):
- `Dev (server + client)` — compound: Vite task + Hono server with debugger attached
- `Server` — Hono server only (watch mode)
- `Scrape`, `Migrate Excel` — run one-shot scripts with debugger

## Project structure

```
src/
  client/
    pages/
      Roster.tsx        # roster list with search + pagination
      MetaTeams.tsx     # team browser with filters, VP sort, tournament import
      TeamMatch.tsx     # slot-by-slot match view with live VP recalculation
    components/
      AutocompleteInput.tsx   # keyboard-navigable autocomplete dropdown
      BuildCard.tsx           # species + build display (compact/full)
      MetaTeamCard.tsx        # team summary card with legality + VP badge
      RosterCard.tsx          # roster entry card
      RosterEditModal.tsx     # create/edit roster entry (with @pkmn/dex autocomplete)
      MatchBadge.tsx          # EXACT / ADJUSTABLE / UNOWNED tier badge
      AlternateSelector.tsx   # pick alternate roster copies of a species
      VPCostBreakdown.tsx     # itemised VP delta display
      SPSpreadDisplay.tsx     # HP/Atk/Def/SpA/SpD/Spe bar display
      PokemonSprite.tsx       # lazy sprite image with error fallback
      Pagination.tsx          # prev/next page controls
      ImportModal.tsx         # pokepaste URL / Showdown paste import form
    lib/
      dexData.ts      # @pkmn/dex species, ability, nature, move name lists
      sprites.ts      # getSpriteUrl(name) → Showdown CDN URL
  server/
    index.ts          # Hono app entry
    routes/
      roster.ts       # CRUD for roster entries
      metaTeams.ts    # meta team list, regulations, seed-species, delete
      match.ts        # team match computation
      import.ts       # pokepaste / showdown / tournament scrape (SSE)
    db/
      schema.ts       # Drizzle schema (rosterEntries, metaTeams, regulations, …)
      queries/        # typed query helpers
      migrations/
    lib/
      legality.ts     # regulation legality checks
    scrapers/
      pikalytics.ts   # usage list, per-species builds, tournament team scrape
      pokepaste.ts
      serebii.ts      # regulation species list scrape
      showdown.ts     # Showdown paste parser
      run.ts          # orchestrator
  scripts/
    migrateExcel.ts
  data/
    megaForms.ts
  shared/
    types.ts          # shared request/response types
    vpCost.ts         # VP delta calculation (used on both client and server)
```

## Key domain concepts

**SP (Stat Points)** — the EV replacement in Pokemon Champions. Max 66 total; max 32 per stat. Recorded as `HP/Atk/Def/SpA/SpD/Spe` (e.g. `2/32/0/0/0/32`). 1 SP ≈ 8 EVs.

**VP cost model** — adding 1 SP costs 5 VP (reducing is free, delta-only). Changing a move costs 250 VP. Changing nature or ability costs 500 VP each. The cost model lives in `src/shared/vpCost.ts` so it runs on both the server (match computation) and the client (live VP recalculation when selecting alternates, "Sort by VP cost" on the MetaTeams page).

**Regulation** — a named ruleset (e.g. M-A, M-B) with a species allowlist and validity date range. Species are seeded from Serebii via the "Seed Species" button on the MetaTeams page. Legality is computed dynamically at query time (see ADR 0001).

**Regulation → Pikalytics format codes** — mapped in `pikalytics.ts` (`REGULATION_FORMAT_CODES`). Defaults to M-B's code if a regulation isn't in the map.

**Battle format** — Ranked Doubles: bring 6, preview opponent's team, lock in 4. No duplicate items per team.

**Species names** — follow Showdown convention: regional forms use `-Alola`, `-Galar`, `-Hisui`, `-Paldea` suffixes. Mega forms are recorded as `Species-Mega` (e.g. `Charizard-Mega-X`).
