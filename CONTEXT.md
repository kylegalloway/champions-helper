# Champions Helper — Domain Glossary

## Core Entities

**Pokemon**
A species or variant (e.g., Garchomp, Charizard, Ninetales-Alola). Species names follow Showdown convention: regional forms use `-Alola`, `-Galar`, `-Hisui`, `-Paldea` suffixes (not `-Alolan`). Mega forms (e.g., Charizard-Mega-Y) are not separate entities — they are the same Pokemon species that Mega Evolves in battle by holding its Mega Stone.

**Roster Entry**
A specific, player-owned copy of a Pokemon. A player may own multiple copies of the same species; each is distinguished by its Nickname. A Roster Entry has exactly one active Build at any time.

**Nickname**
The in-game name given to a specific copy of a Pokemon. Nicknames (combined with species) uniquely identify a Roster Entry. A Pokemon without a nickname uses a null/empty nickname.

**Build**
The full configuration of a Roster Entry: four Moves, one Ability, one Nature, and a SP Spread. Changing any part of a Build costs VP.

**Home Pokemon**
A Roster Entry loaned into Pokemon Champions from the player's Pokemon Home account. Treated as owned for team-building purposes.

**SP (Stat Points)**
The EV replacement system in Pokemon Champions. Each Pokemon has a maximum of 66 SPs total, with at most 32 SPs assignable to any single stat. Stats are ordered: HP / Atk / Def / SpAtk / SpDef / Spd. Recorded as a slash-delimited string (e.g., `2/32/0/0/0/32`). 1 SP ≈ 8 traditional EVs.

**SP Spread**
The full six-stat allocation of SPs for a Roster Entry.

**VP (Victory Points)**
The primary in-game currency. Earned through battles and missions; cannot be purchased. Used to recruit Pokemon and retrain Builds.

**VP Cost (Build change)**
- Adding 1 SP to any stat: 5 VP (reducing is free)
- Changing 1 Move: 250 VP
- Changing Nature: 500 VP
- Changing Ability: 500 VP
- SP cost is delta-only: only SPs added above the current value are charged.

**Mega Evolution**
A battle transformation available to certain Pokemon when holding their species-specific Mega Stone. Only one Pokemon per team may Mega Evolve per match, and it holds its Mega Stone for the entire match (no other item).

**Regulation**
A named ruleset (e.g., M-A, M-B) that defines which Pokemon species are legal in Ranked Battles, along with a validity date range. A team is legal in a Regulation if every Pokemon in the team appears in that Regulation's allowed roster.

**Meta Team**
A team of 6 Pokemon (each with a full Build) sourced from competitive data (Pikalytics tournament pages, pokepast.es, or manual entry). Tagged with its source and the Regulation it was imported under. Legality in other Regulations is computed dynamically. Note: Pokemon-Zone is Cloudflare-protected and not scrapeable.

**Partial Team**
A Meta Team with fewer than 6 Pokemon slots filled. Flagged as partial in the UI and in the DB.

**Match Tier**
How closely a Roster Entry matches a specific slot in a Meta Team:
- **Exact** — same species, ability, nature, SP spread, and all four moves. VP cost = 0.
- **Adjustable** — same species; can reach the target Build by spending VP. Displays calculated VP cost.
- **Unowned** — player does not have this species (or any copy of it). Flagged; player may have it in Pokemon Home.

**Substitution** *(future)*
A different species that fills a similar competitive role to a Meta Team slot. Not implemented in v1.

## Reference Data

**Species Data**
Moves, abilities, natures, types, and species metadata are sourced from the `@pkmn/data` package (Showdown data, bundled as static JSON). This drives frontend autocomplete and validation without runtime scraping.

**Pokemon Images**
Sprites and official artwork sourced from PokeAPI (`pokeapi.co`). Cached locally on first use. Type icons bundled as static assets.

**Pikalytics Integration**
- Usage list: `GET /ai/pokedex/{formatCode}` — Markdown, top 50 Pokemon with links
- Per-Pokemon builds: `GET /ai/pokedex/{formatCode}/{speciesName}` — Markdown with moves, abilities, items, SP spreads (already in SP values, no conversion needed)
- Tournament teams: `GET /tournaments/rk9/{slug}` or `/tournaments/limitless/{slug}` — server-rendered HTML
- Regulation M-B format code: `battledataregmbs3`
- robots.txt: fully open, ClaudeBot explicitly allowed

**Regulation Species Lists**
Scraped once per regulation from `serebii.net/pokemonchampions/rankedbattle/regulation{name}.shtml`.

## Battle Format

Pokemon Champions Ranked Doubles: each player brings 6 Pokemon, previews the opponent's team, then locks in 4 to battle with. Battles are 2v2. Each team may not contain duplicate items.
