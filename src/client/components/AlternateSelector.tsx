import type { RosterEntry } from '../../shared/types';
import { BuildCard } from './BuildCard';

interface Props {
  alternates: RosterEntry[];
  selected: RosterEntry | undefined;
  onSelect: (entry: RosterEntry) => void;
}

export function AlternateSelector({ alternates, selected, onSelect }: Props) {
  if (alternates.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-500 mb-1">Other copies:</div>
      <div className="flex flex-col gap-1">
        {alternates.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className={`text-left px-2 py-1 rounded text-xs border transition-colors ${
              selected?.id === entry.id
                ? 'border-amber-600 bg-amber-950'
                : 'border-gray-700 bg-gray-900 hover:border-gray-500'
            }`}
          >
            <BuildCard build={entry} compact />
          </button>
        ))}
      </div>
    </div>
  );
}
