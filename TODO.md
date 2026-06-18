# Champions Helper — Todo

All high and medium priority items are complete. Remaining items are low-priority future enhancements.

---

## Low Priority / Future

### Substitution suggestions
For UNOWNED slots, suggest roster entries of a different species that fill a similar competitive role/archetype. Would require a role/archetype taxonomy or embedding-based similarity.

### "Build around a core of 2-4 Pokemon"
Select 2–4 Pokemon from the roster, find meta teams that include all of them, and show VP cost to complete the team. Could be implemented as additional filter chips on the MetaTeams page.

### Item cost tracking
One-time VP purchase per item, freely reassigned between Pokemon, no duplicate items per team. Requires modeling an item inventory — significant schema and UI work.

### Type icons
Bundle type icons as static SVG/PNG assets. Display on `BuildCard` and `MetaTeamSlot` rows to make type coverage more scannable.

### PokeAPI sprite caching
Backfill `species.pokeapi_url` via PokeAPI for official artwork or animated sprites. Current Showdown CDN covers all forms; this is only needed if higher-quality images are wanted.

### Pagination virtualization
Current pagination is simple prev/next. For very large imports (500+ teams), consider virtual scrolling with `@tanstack/virtual` to avoid rendering all page DOM nodes.

### Offline / PWA
Service worker + manifest so the app works without a network connection (roster and cached team data).
