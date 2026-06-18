# ADR 0003: Bundle @pkmn/data for moves/abilities/natures reference data

## Status
Accepted

## Context
The frontend needs autocomplete and validation for move names, ability names, natures, and species names. Options considered: scrape Serebii, query PokeAPI at runtime, or bundle static JSON from the `@pkmn/data` npm package (the same data that powers Pokemon Showdown).

## Decision
Bundle `@pkmn/data` as a dev/build dependency. Export the relevant subsets (moves, abilities, natures, species) as static JSON served alongside the app. Use PokeAPI sprite URLs for Pokemon images, item icons, and type icons — fetched on demand and cached locally in the SQLite DB (as URLs, not binary blobs).

## Consequences
- Autocomplete and validation work fully offline with no runtime scraping.
- `@pkmn/data` covers all Pokemon Champions species since the game uses standard Pokemon.
- Species names in `@pkmn/data` follow Showdown convention (`Ninetales-Alola`, not `Ninetales-Alolan`) — consistent with the canonical naming standard established in CONTEXT.md.
- PokeAPI images require a network request on first load per species; subsequent loads are served from cache. This is acceptable for a local tool.
- If a Champions-exclusive mechanic diverges from Showdown data (e.g., a new ability not yet in `@pkmn/data`), the user can still type the value manually — autocomplete is a convenience, not a hard constraint.
