import type { RosterEntry } from '../../shared/types';
import { SPSpreadDisplay } from './SPSpreadDisplay';

interface Props {
  entry: RosterEntry;
  onEdit: (entry: RosterEntry) => void;
}

export function RosterCard({ entry, onEdit }: Props) {
  const moves = [entry.move1, entry.move2, entry.move3, entry.move4].filter(Boolean);

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer"
      onClick={() => onEdit(entry)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-white">
            {entry.speciesName}
            {entry.nickname && (
              <span className="text-gray-400 text-sm ml-1">"{entry.nickname}"</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {entry.ability} · {entry.nature} Nature
          </div>
        </div>
        {entry.isHomePokemon && (
          <span className="text-xs bg-blue-900 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded ml-2 shrink-0">
            HOME
          </span>
        )}
      </div>
      <SPSpreadDisplay spread={entry.spSpread} />
      <div className="flex gap-1 flex-wrap mt-2">
        {moves.map((m) => (
          <span key={m} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
