import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { MatchResult, MatchSlot, MatchTier, RosterEntry } from '../../shared/types';
import { vpCost, isExactMatch } from '../../shared/vpCost';
import { MatchBadge } from '../components/MatchBadge';
import { BuildCard } from '../components/BuildCard';
import { VPCostBreakdown } from '../components/VPCostBreakdown';
import { AlternateSelector } from '../components/AlternateSelector';

function MatchSlotRow({ matchSlot }: { matchSlot: MatchSlot }) {
  const [selectedAlternate, setSelectedAlternate] = useState<RosterEntry | undefined>(
    matchSlot.matchedEntry
  );

  const displayEntry = selectedAlternate ?? matchSlot.matchedEntry;

  const { activeTier, activeCost } = useMemo<{ activeTier: MatchTier; activeCost: number }>(() => {
    if (!displayEntry) return { activeTier: 'UNOWNED', activeCost: 0 };
    if (isExactMatch(displayEntry, matchSlot.targetSlot)) return { activeTier: 'EXACT', activeCost: 0 };
    return { activeTier: 'ADJUSTABLE', activeCost: vpCost(displayEntry, matchSlot.targetSlot) };
  }, [displayEntry, matchSlot.targetSlot]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 grid grid-cols-2 gap-4">
      {/* Target build (left) */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Target build</div>
        <BuildCard build={matchSlot.targetSlot} />
      </div>

      {/* Match result (right) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MatchBadge tier={activeTier} />
          {activeTier === 'ADJUSTABLE' && (
            <span className="text-xs text-amber-400">{activeCost} VP</span>
          )}
          {activeTier === 'UNOWNED' && matchSlot.targetSlot.speciesName && (
            <span className="text-xs text-gray-500">Check Pokémon Home</span>
          )}
        </div>

        {displayEntry ? (
          <>
            <BuildCard build={displayEntry} />
            {activeTier === 'ADJUSTABLE' && displayEntry && (
              <VPCostBreakdown
                current={displayEntry}
                target={matchSlot.targetSlot}
                totalCost={activeCost}
              />
            )}
            <AlternateSelector
              alternates={matchSlot.alternates}
              selected={selectedAlternate}
              onSelect={setSelectedAlternate}
            />
          </>
        ) : (
          <div className="text-gray-600 text-sm">Not in roster</div>
        )}
      </div>
    </div>
  );
}

export function TeamMatchPage() {
  const { teamId } = useParams({ from: '/match/$teamId' });

  const { data: matchResult, isLoading, error } = useQuery<MatchResult>({
    queryKey: ['match', teamId],
    queryFn: () =>
      fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: Number(teamId) }),
      }).then((r) => r.json()),
  });

  if (isLoading) return <div className="text-gray-500 text-center py-12 p-6">Computing match…</div>;
  if (error || !matchResult) return <div className="text-red-400 text-center py-12 p-6">Failed to compute match</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Team Match</h1>
      </div>

      <div className="flex items-center gap-6 bg-gray-900 border border-gray-800 rounded-lg px-5 py-3 mb-5 text-sm">
        <span className="text-gray-400">
          Exact: <span className="text-green-400 font-semibold">{matchResult.slots.filter((s) => s.tier === 'EXACT').length}</span>
        </span>
        <span className="text-gray-400">
          Adjustable: <span className="text-amber-400 font-semibold">{matchResult.slots.filter((s) => s.tier === 'ADJUSTABLE').length}</span>
        </span>
        <span className="text-gray-400">
          Unowned: <span className="text-red-400 font-semibold">{matchResult.slots.filter((s) => s.tier === 'UNOWNED').length}</span>
        </span>
        <span className="ml-auto text-gray-400">
          Total VP cost:{' '}
          <span className={`font-bold text-base ${matchResult.totalVpCost === 0 ? 'text-green-400' : 'text-amber-400'}`}>
            {matchResult.totalVpCost}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {matchResult.slots.map((slot) => (
          <MatchSlotRow key={slot.slot} matchSlot={slot} />
        ))}
      </div>

      {/* Sticky VP summary footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">
            Exact:{' '}
            <span className="text-green-400">
              {matchResult.slots.filter((s) => s.tier === 'EXACT').length}
            </span>
          </span>
          <span className="text-gray-400">
            Adjustable:{' '}
            <span className="text-amber-400">
              {matchResult.slots.filter((s) => s.tier === 'ADJUSTABLE').length}
            </span>
          </span>
          <span className="text-gray-400">
            Unowned:{' '}
            <span className="text-red-400">
              {matchResult.slots.filter((s) => s.tier === 'UNOWNED').length}
            </span>
          </span>
        </div>
        <div className="text-lg font-bold">
          <span className="text-gray-400 text-sm mr-2">Total VP cost:</span>
          <span className={matchResult.totalVpCost === 0 ? 'text-green-400' : 'text-amber-400'}>
            {matchResult.totalVpCost}
          </span>
        </div>
      </div>
    </div>
  );
}
