import { SPSpreadDisplay } from './SPSpreadDisplay';
import { PokemonSprite } from './PokemonSprite';
import { detectRoles, roleColor } from '../../shared/roles';

interface Build {
  speciesName: string;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  ability: string;
  nature: string;
  natureEstimated?: boolean;
  spSpread: string;
  spSpreadEstimated?: boolean;
  item?: string | null;
  nickname?: string;
}

interface Props {
  build: Build;
  compact?: boolean;
}

export function BuildCard({ build, compact }: Props) {
  const moves = [build.move1, build.move2, build.move3, build.move4].filter(Boolean);

  return (
    <div className="space-y-1">
      <div className="font-semibold text-white flex items-center gap-2">
        <PokemonSprite speciesName={build.speciesName} size={compact ? 'sm' : 'md'} />
        <span>
          {build.speciesName}
          {build.nickname && <span className="text-gray-400 text-sm ml-1">({build.nickname})</span>}
          {build.item && <span className="text-gray-500 text-xs ml-1">@ {build.item}</span>}
        </span>
      </div>
      <div className="text-xs text-gray-400">
        {build.ability}
        {build.nature && (
          <>
            {' · '}
            {build.natureEstimated && (
              <span className="text-yellow-600" title="Estimated from ranked battle data">~</span>
            )}
            {build.nature} Nature
          </>
        )}
      </div>
      <SPSpreadDisplay spread={build.spSpread} estimated={build.spSpreadEstimated} compact={compact} />
      {!compact && (
        <div className="flex gap-1 flex-wrap mt-1">
          {moves.map((m) => (
            <span key={m} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
              {m}
            </span>
          ))}
        </div>
      )}
      {!compact && (() => {
        const roles = detectRoles(build);
        return roles.length > 0 ? (
          <div className="flex gap-1 flex-wrap mt-1">
            {roles.map((r) => (
              <span key={r} className={`text-xs border px-1.5 py-0.5 rounded ${roleColor(r)}`}>
                {r}
              </span>
            ))}
          </div>
        ) : null;
      })()}
    </div>
  );
}
