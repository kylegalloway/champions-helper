import { getAllRosterEntries, getRosterEntriesBySpecies } from './roster';
import { getMetaTeamWithSlots } from './metaTeams';
import { vpCost, isExactMatch } from '../../lib/vpCost';
import type { MatchResult, MatchSlot, RosterEntry, MetaTeamSlot } from '../../../shared/types';

export async function computeMatch(teamId: number): Promise<MatchResult | null> {
  const team = await getMetaTeamWithSlots(teamId);
  if (!team || !team.slots) return null;

  const allRoster = await getAllRosterEntries();
  const rosterBySpecies = new Map<string, RosterEntry[]>();
  for (const entry of allRoster) {
    const list = rosterBySpecies.get(entry.speciesName) ?? [];
    list.push(entry);
    rosterBySpecies.set(entry.speciesName, list);
  }

  const slots: MatchSlot[] = [];

  for (const targetSlot of team.slots) {
    let owned = rosterBySpecies.get(targetSlot.speciesName) ?? [];
    if (owned.length === 0 && targetSlot.speciesName.includes('-Mega')) {
      const baseName = targetSlot.speciesName.replace(/-Mega.*$/, '');
      owned = rosterBySpecies.get(baseName) ?? [];
    }

    if (owned.length === 0) {
      slots.push({
        slot: targetSlot.slot,
        targetSlot,
        tier: 'UNOWNED',
        vpCost: 0,
        alternates: [],
      });
      continue;
    }

    // Find best match: prefer EXACT, then lowest VP cost
    let bestEntry: RosterEntry | undefined;
    let bestCost = Infinity;
    let isExact = false;

    for (const entry of owned) {
      if (isExactMatch(entry, targetSlot)) {
        bestEntry = entry;
        bestCost = 0;
        isExact = true;
        break;
      }
      const cost = vpCost(entry, targetSlot);
      if (cost < bestCost) {
        bestCost = cost;
        bestEntry = entry;
      }
    }

    const alternates = owned.filter((e) => e.id !== bestEntry?.id);

    slots.push({
      slot: targetSlot.slot,
      targetSlot,
      tier: isExact ? 'EXACT' : 'ADJUSTABLE',
      matchedEntry: bestEntry,
      vpCost: bestCost,
      alternates,
    });
  }

  const totalVpCost = slots.reduce((sum, s) => sum + s.vpCost, 0);

  return { teamId, slots, totalVpCost };
}
