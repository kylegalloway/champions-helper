import type { RosterEntry, MetaTeamSlot } from './types';

export function parseSP(spread: string): number[] {
  return spread.split('/').map(Number);
}

function isUnknownSpread(spread: string): boolean {
  return spread === '0/0/0/0/0/0' || spread === '';
}

export function vpCost(current: RosterEntry, target: MetaTeamSlot): number {
  const curMoves = [current.move1, current.move2, current.move3, current.move4];
  const tgtMoves = [target.move1, target.move2, target.move3, target.move4].filter(Boolean);
  const moveCost = tgtMoves.filter((m) => !curMoves.includes(m)).length * 250;

  // Skip nature cost if target nature is unknown or estimated
  const natureCost = target.nature && !target.natureEstimated && current.nature !== target.nature ? 500 : 0;

  // Skip ability cost if target ability is unknown
  const abilityCost = target.ability && current.ability !== target.ability ? 500 : 0;

  // Skip SP cost if target spread is unknown (all zeros = not specified)
  let spCost = 0;
  if (!isUnknownSpread(target.spSpread)) {
    const cur = parseSP(current.spSpread);
    const tgt = parseSP(target.spSpread);
    spCost = tgt.reduce((sum, t, i) => sum + Math.max(0, t - cur[i]) * 5, 0);
  }

  return spCost + moveCost + natureCost + abilityCost;
}

export function isExactMatch(current: RosterEntry, target: MetaTeamSlot): boolean {
  // Can't be exact if target has unknown or estimated fields
  if (!target.nature || target.natureEstimated || !target.ability || isUnknownSpread(target.spSpread)) return false;

  if (current.nature !== target.nature) return false;
  if (current.ability !== target.ability) return false;
  if (current.spSpread !== target.spSpread) return false;

  const curMoves = new Set([current.move1, current.move2, current.move3, current.move4]);
  const tgtMoves = [target.move1, target.move2, target.move3, target.move4].filter(Boolean);
  return tgtMoves.every((m) => curMoves.has(m));
}
