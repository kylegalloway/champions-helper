import { Link } from '@tanstack/react-router';
import type { MetaTeam } from '../../shared/types';

interface Props {
  team: MetaTeam;
}

export function MetaTeamCard({ team }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-white flex items-center gap-2">
            {team.name ?? `Team #${team.id}`}
            {team.isPartial && (
              <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-1.5 py-0.5 rounded">
                PARTIAL
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {team.source}
            {team.regulationName && <> · {team.regulationName}</>}
          </div>
        </div>
        <Link
          to="/match/$teamId"
          params={{ teamId: String(team.id) }}
          className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 border border-blue-700 px-3 py-1 rounded transition-colors"
        >
          Match →
        </Link>
      </div>

      {team.slots && team.slots.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {team.slots.map((slot) => (
            <span
              key={slot.id}
              className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded"
            >
              {slot.speciesName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
