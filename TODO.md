# Champions Helper — Todo

## High Priority / Functional Gaps

### 1. Autocomplete in RosterEditModal
Species, ability, nature, and move fields are plain text inputs. Typos silently create wrong data (e.g. "Gardevoir" vs "gardevoir" breaks matching). Wire up `@pkmn/dex` on the frontend for suggestions on all four field types.

### 2. Regulation seeding — no regulations in DB on fresh install
The `regulations` table starts empty. Import requires a regulation that doesn't exist yet, so the first import always fails with "Unknown regulation". Need either a seed script or an admin API endpoint (`POST /api/regulations`) to create regulations (name + optional date range).

### 3. Serebii regulation species import not exposed
`src/server/scrapers/serebii.ts` and `src/server/scrapers/run.ts` exist but there's no UI button or API endpoint to trigger populating `regulation_species`. Without this, the legality check (`legality.ts`) has no data to work with.

### 4. Tournament import: capture player name and record
When scraping Pikalytics tournament pages, the `window.__TOURNAMENTS_DATA__` JSON already includes `author` and `record` per team (`PikalyticsTournamentTeam` interface in `pikalytics.ts`), but these aren't persisted. Steps:
- Add `playerName text` and `playerRecord text` columns to `meta_teams` in `schema.ts`
- Generate + apply a new Drizzle migration
- Pass them through in `saveMetaTeam` and the scrape route (`import.ts`)
- Display on `MetaTeamCard`

### 5. Delete meta team
No way to remove an imported team. Add `DELETE /api/meta-teams/:id` and a delete button on `MetaTeamCard` (with confirmation).

### 6. Tournament import: report why each team was skipped
Currently the scrape route in `import.ts` increments a `skipped` counter silently — the SSE log shown in the UI just says "X skipped" with no breakdown. There are three distinct skip reasons: empty slot list, duplicate content hash, and save error. Each should emit a `progress` SSE event naming the team index and the reason (e.g. "Team 3 skipped: duplicate of team #12 (M-B)", "Team 7 skipped: no Pokemon parsed", "Team 11 skipped: unknown species Fluttermane"). The final `done` message should also break down the skipped count by reason.

---

## Medium Priority

### 6. Pokemon/type/item images throughout the UI
The `species.pokeapi_url` column already exists in the schema but is never populated. Roll out images across the app:
- **Species sprites**: fetch from PokeAPI on first use, cache the URL in `species.pokeapi_url`. Apply to `RosterCard`, `BuildCard`, `MetaTeamCard` slot chips, and the match view slot rows.
- **Type icons**: bundle as static assets (SVG or PNG). Display on `BuildCard` and `MetaTeamSlot` rows.
- **Item images**: PokeAPI also has item sprites. Display next to item names in `BuildCard` and the match view.

### 7. isHomePokemon not shown on RosterCard
The field is stored and editable but `RosterCard.tsx` doesn't visually distinguish Home Pokemon. Add a small "HOME" badge or icon.

### 8. Legality indicator on MetaTeamCard
`src/server/lib/legality.ts` exists but is never called. After regulation species data is seeded (see #3), add a legality badge to `MetaTeamCard` — e.g. a green checkmark or red X for the currently selected regulation.

### 9. Tournament scraper hardcodes Reg M-B format code
`fetchEstimatedRankedData` in `pikalytics.ts` always uses `battledataregmbs3` regardless of the selected regulation. Should map regulation name → Pikalytics format code (e.g. M-A → its format code) and pass it through.

### 10. Item not displayed in BuildCard / TeamMatch
`MetaTeamSlot.item` is stored but unused in the match view. Show the held item in `BuildCard` and next to each slot in `TeamMatch`.

### 11. AlternateSelector VP cost doesn't recalculate on selection
In `TeamMatch.tsx`, `MatchSlotRow` shows the VP cost from the best-matched entry. When the user picks a different alternate via `AlternateSelector`, the displayed VP cost should recalculate against the selected alternate's current build, not the original best match.

---

## Low Priority / Future

### 12. Pagination / virtualization
No pagination on Roster or Meta Teams pages. Fine for small rosters but will degrade with large imports. Add virtual scrolling or pagination when counts grow large.

### 13. Substitution suggestions
For UNOWNED slots, suggest roster entries of a different species that fill a similar competitive role/archetype. Noted as a future feature in the original design.

### 14. "What teams can I build from my roster?" entry point
A reverse lookup: given the current roster, surface all meta teams where every slot is EXACT or ADJUSTABLE (within a VP budget threshold).

### 15. "Build around a core of 2-4 Pokemon" entry point
Select 2–4 Pokemon from the roster, find meta teams that include all of them, and show VP cost to complete the team.

### 16. Item cost tracking
One-time VP purchase per item, freely reassigned between Pokemon, no duplicate items per team. Requires modeling an item inventory.
