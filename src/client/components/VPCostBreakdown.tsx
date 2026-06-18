import type { RosterEntry, MetaTeamSlot } from '../../shared/types';

interface Props {
  current: RosterEntry;
  target: MetaTeamSlot;
  totalCost: number;
}

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

export function VPCostBreakdown({ current, target, totalCost }: Props) {
  const curSP = current.spSpread.split('/').map(Number);
  const tgtSP = target.spSpread.split('/').map(Number);

  const spChanges = STAT_LABELS.map((label, i) => ({
    label,
    from: curSP[i],
    to: tgtSP[i],
    cost: Math.max(0, tgtSP[i] - curSP[i]) * 5,
  })).filter((c) => c.from !== c.to);

  const curMoves = [current.move1, current.move2, current.move3, current.move4];
  const tgtMoves = [target.move1, target.move2, target.move3, target.move4].filter(Boolean);
  const toAdd = tgtMoves.filter((m) => !curMoves.includes(m));
  const toRemove = curMoves.filter((m) => m && !tgtMoves.includes(m));

  const hasNatureChange = !!target.nature && !target.natureEstimated && current.nature !== target.nature;
  const hasAbilityChange = !!target.ability && current.ability !== target.ability;

  if (totalCost === 0) return null;

  return (
    <div className="text-xs space-y-1 mt-2">
      {spChanges.map((c) => (
        <div key={c.label} className="flex justify-between text-gray-400">
          <span>
            {c.label}: {c.from} → {c.to}
          </span>
          <span className={c.cost > 0 ? 'text-amber-400' : 'text-green-400'}>
            {c.cost > 0 ? `+${c.cost} VP` : 'free'}
          </span>
        </div>
      ))}
      {toAdd.map((m, i) => (
        <div key={m} className="flex justify-between text-gray-400">
          <span>
            Learn {m}
            {toRemove[i] && <span className="text-gray-600"> (replacing {toRemove[i]})</span>}
          </span>
          <span className="text-amber-400">+250 VP</span>
        </div>
      ))}
      {hasNatureChange && (
        <div className="flex justify-between text-gray-400">
          <span>
            Nature: {current.nature} → {target.nature}
          </span>
          <span className="text-amber-400">+500 VP</span>
        </div>
      )}
      {hasAbilityChange && (
        <div className="flex justify-between text-gray-400">
          <span>
            Ability: {current.ability} → {target.ability}
          </span>
          <span className="text-amber-400">+500 VP</span>
        </div>
      )}
      <div className="flex justify-between font-semibold border-t border-gray-700 pt-1 mt-1">
        <span className="text-gray-300">Total</span>
        <span className="text-amber-300">{totalCost} VP</span>
      </div>
    </div>
  );
}
