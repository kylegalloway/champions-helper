const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

interface Props {
  spread: string;
  estimated?: boolean;
  compact?: boolean;
}

export function SPSpreadDisplay({ spread, estimated, compact }: Props) {
  const values = spread.split('/').map(Number);
  const isAllZero = values.every((v) => v === 0);

  if (compact) {
    return (
      <span className="text-xs text-gray-400 font-mono">
        {estimated && <span className="text-yellow-600 mr-0.5" title="Estimated from ranked data">~</span>}
        {values.join(' / ')}
      </span>
    );
  }

  if (isAllZero && !estimated) {
    return <span className="text-xs text-gray-600 italic">SP spread unknown</span>;
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {estimated && (
        <span className="text-xs text-yellow-600 font-medium" title="Estimated from ranked battle data — not the exact spread used in this tournament">
          ~est
        </span>
      )}
      {STAT_LABELS.map((label, i) => (
        <span key={label} className={`text-xs font-mono ${values[i] > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
          {label} {values[i]}
        </span>
      ))}
    </div>
  );
}
