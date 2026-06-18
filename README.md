# Champions Helper

A team-building assistant for Pokemon Champions Ranked Doubles. Tracks your roster, imports competitive meta teams, and calculates the VP cost to retrain any of your Pokemon to match a given meta build.

## What it does

- **Roster management** — store your owned Pokemon with their current builds (moves, ability, nature, SP spread)
- **Meta team import** — scrape team data from Pikalytics, pokepast.es, or Serebii; store meta teams tagged by Regulation
- **Team matching** — for any meta team slot, compare every Roster Entry of that species and classify the match:
  - **Exact** — already matches; 0 VP to retrain
  - **Adjustable** — reachable by spending VP; shows the calculated cost breakdown
  - **Unowned** — not in your roster (may still be in Pokemon Home)
- **Legality check** — validates teams against the active Regulation's species list

## Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| Backend | Hono (runs in Bun) |
| Database | SQLite via Drizzle ORM |
| Reference data | `@pkmn/dex` (Showdown data) |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.2

## Setup

```bash
bun install
bun run db:migrate
```

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
| `bun run db:generate` | Generate a new Drizzle migration from schema changes |
| `bun run db:migrate` | Apply pending migrations |

## VS Code

Tasks and launch configurations are provided in `.vscode/`.

**Tasks** (`Ctrl+Shift+B` / `Cmd+Shift+B`):
- `Dev (server + client)` — starts Hono + Vite together
- `Build` — production build
- `Scrape`, `Migrate Excel`, `DB Generate`, `DB Migrate`

**Launch configurations** (Run & Debug panel):
- `Dev (server + client)` — compound: Vite task + Hono server with debugger attached
- `Server` — Hono server only (watch mode)
- `Scrape`, `Migrate Excel`, `DB Migrate` — run one-shot scripts with debugger

## Project structure

```
src/
  client/
    pages/          # Roster, MetaTeams, TeamMatch
    components/     # BuildCard, RosterCard, MetaTeamCard, MatchBadge, VPCostBreakdown, …
    main.tsx
  server/
    index.ts        # Hono app entry
    routes/         # roster, metaTeams, match, import
    db/
      schema.ts     # Drizzle schema (rosterEntries, metaTeams, regulations, …)
      queries/      # typed query helpers
      migrations/
    lib/
      vpCost.ts     # VP delta calculation
      legality.ts   # Regulation legality checks
    scrapers/
      pikalytics.ts
      pokepaste.ts
      serebii.ts
      showdown.ts
      run.ts        # orchestrator
  scripts/
    migrateExcel.ts
  data/
    megaForms.ts
  shared/
    types.ts        # shared request/response types
```

## Key domain concepts

**SP (Stat Points)** — the EV replacement in Pokemon Champions. Max 66 total; max 32 per stat. Recorded as `HP/Atk/Def/SpAtk/SpDef/Spd` (e.g. `2/32/0/0/0/32`). 1 SP ≈ 8 EVs.

**VP cost model** — adding 1 SP costs 5 VP (reducing is free, delta-only). Changing a move costs 250 VP. Changing nature or ability costs 500 VP each.

**Regulation** — a named ruleset (e.g. M-A, M-B) with a species allowlist and validity date range. Current ranked format: Regulation M-B (`battledataregmbs3` on Pikalytics).

**Battle format** — Ranked Doubles: bring 6, preview opponent's team, lock in 4. No duplicate items per team.

**Species names** — follow Showdown convention: regional forms use `-Alola`, `-Galar`, `-Hisui`, `-Paldea` suffixes. Mega forms are the base species holding their Mega Stone.
