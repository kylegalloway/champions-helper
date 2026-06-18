# ADR 0003: Bundle @pkmn/dex for moves/abilities/natures reference data; use Showdown CDN for sprites

## Status
Accepted (amended: sprite source changed from PokeAPI to Showdown CDN)

## Context
The frontend needs autocomplete and validation for move names, ability names, natures, and species names. Options considered: scrape Serebii, query PokeAPI at runtime, or bundle static data from an npm package. For sprites, options considered: PokeAPI (requires ID lookup per species), Showdown CDN (deterministic URL from species name slug).

## Decision
Bundle `@pkmn/dex` (the npm package that powers Pokémon Showdown) as a dependency. At build time, export the relevant subsets (moves, abilities, natures, species) from `src/client/lib/dexData.ts` for use in `AutocompleteInput` on all four field types in `RosterEditModal`.

For sprites, use the Pokémon Showdown CDN (`play.pokemonshowdown.com/sprites/dex/{id}.png`) rather than PokeAPI. The sprite ID is derived deterministically by lowercasing the species name and removing non-alphanumeric characters (e.g., `Charizard-Mega-X` → `charizardmegax`). This works for all VGC-legal forms including megas and regionals without any API calls or DB caching.

The `species.pokeapi_url` column is retained in the schema for potential future use (higher-quality artwork, animated sprites) but is not currently populated.

## Consequences
- Autocomplete and validation work fully offline with no runtime scraping.
- `@pkmn/dex` covers all Pokemon Champions species since the game uses standard Pokemon mechanics.
- Species names follow Showdown convention (`Ninetales-Alola`, not `Ninetales-Alolan`) — consistent with CONTEXT.md.
- The `@pkmn/dex` learnsets chunk is large (~3 MB minified); it's split into a separate Vite chunk and loaded lazily. Autocomplete data itself is much smaller.
- Showdown CDN sprites require no API key, no caching, and handle all forms. If a sprite is missing (returns 404), `PokemonSprite` silently hides the image via `onError`.
- If a Champions-exclusive mechanic diverges from Showdown data (e.g., a new ability not yet in `@pkmn/dex`), the user can still type the value manually — autocomplete is a convenience, not a hard constraint.
