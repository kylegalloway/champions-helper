import { Link } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MetaTeam } from '../../shared/types';
import { PokemonSprite } from './PokemonSprite';
import { detectTeamRoles, roleColor } from '../../shared/roles';

function tournamentSlugFromUrl(url: string): string | null {
  const m = url.match(/\/tournaments\/(?:rk9|limitless)\/([^/?#]+)/);
  return m?.[1] ?? null;
}

function SourceLabel({ team }: { team: MetaTeam }) {
  const { source, sourceUrl } = team;
  const label = sourceUrl
    ? (tournamentSlugFromUrl(sourceUrl) ?? source)
    : source;

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-300 underline underline-offset-2 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </a>
    );
  }
  return <>{label}</>;
}

interface Props {
  team: MetaTeam;
  estimatedVpCost?: number;
}

export function MetaTeamCard({ team, estimatedVpCost }: Props) {
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/meta-teams/${team.id}`, { method: 'DELETE' }).then((r) => {
      if (!r.ok) throw new Error('Delete failed');
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meta-teams'] }),
  });

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
            {team.isLegal === true && (
              <span className="text-xs bg-green-950 text-green-400 border border-green-800 px-1.5 py-0.5 rounded">
                LEGAL
              </span>
            )}
            {team.isLegal === false && (
              <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                ILLEGAL
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              <SourceLabel team={team} />
              {team.regulationName && <> · {team.regulationName}</>}
            </span>
            {estimatedVpCost !== undefined && (
              <span className={`font-medium ${estimatedVpCost === 0 ? 'text-green-500' : 'text-amber-400'}`}>
                {estimatedVpCost === 0 ? '✓ 0 VP' : `~${estimatedVpCost} VP`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/match/$teamId"
            params={{ teamId: String(team.id) }}
            className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 border border-blue-700 px-3 py-1 rounded transition-colors"
          >
            Match →
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete "${team.name ?? `Team #${team.id}`}"?`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="text-xs bg-red-950 hover:bg-red-900 disabled:opacity-50 text-red-400 border border-red-900 px-2 py-1 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {team.slots && team.slots.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {team.slots.map((slot) => (
              <span
                key={slot.id}
                className="inline-flex items-center gap-1 text-xs bg-gray-800 text-gray-300 pl-1 pr-2 py-0.5 rounded"
              >
                <PokemonSprite speciesName={slot.speciesName} size="sm" />
                {slot.speciesName}
              </span>
            ))}
          </div>
          {(() => {
            const roles = detectTeamRoles(team.slots);
            return roles.length > 0 ? (
              <div className="flex gap-1 flex-wrap mt-1.5">
                {roles.map((r) => (
                  <span key={r} className={`text-xs border px-1.5 py-0.5 rounded ${roleColor(r)}`}>
                    {r}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
        </>
      )}
    </div>
  );
}
