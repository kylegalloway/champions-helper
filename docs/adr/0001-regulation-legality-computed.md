# ADR 0001: Regulation legality is computed, not stored per team

## Status
Accepted

## Context
Meta Teams are imported from various sources (Pikalytics, Pokemon-Zone, pokepast.es, manual entry) and tagged with the Regulation they were found under. Many regulations share large portions of the same legal Pokemon roster, so a team imported under M-B may also be fully legal in M-C or M-A.

## Decision
A Meta Team's legality in any given Regulation is computed dynamically: check whether all Pokemon species in the team appear in that Regulation's allowed roster. Teams are not tagged to a fixed set of Regulations at import time.

## Consequences
- The `regulations` table must store the full allowed-Pokemon list for each Regulation.
- Legality queries join team species against the regulation roster at query time.
- When a new Regulation is added, all existing teams are automatically evaluated for legality with no re-import needed.
- Requires keeping regulation allowed-Pokemon lists accurate; stale regulation data produces incorrect legality results.
