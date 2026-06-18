import type { MatchTier } from '../../shared/types';

interface Props {
  tier: MatchTier;
}

const config: Record<MatchTier, { label: string; className: string }> = {
  EXACT: { label: 'EXACT', className: 'bg-green-900 text-green-300 border border-green-700' },
  ADJUSTABLE: { label: 'ADJUSTABLE', className: 'bg-amber-900 text-amber-300 border border-amber-700' },
  UNOWNED: { label: 'UNOWNED', className: 'bg-red-900 text-red-300 border border-red-700' },
};

export function MatchBadge({ tier }: Props) {
  const { label, className } = config[tier];
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${className}`}>
      {label}
    </span>
  );
}
