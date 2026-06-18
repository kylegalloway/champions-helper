import { useState } from 'react';
import { getSpriteUrls } from '../lib/sprites';

interface Props {
  speciesName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

export function PokemonSprite({ speciesName, size = 'md', className = '' }: Props) {
  // Track which URLs have failed; try each in order until one loads or all fail.
  // Using a Set of failed URLs (not an index) means this resets naturally when
  // speciesName changes because the new URLs aren't in the failed set.
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());

  const urls = getSpriteUrls(speciesName);
  const src = urls.find((u) => !failedUrls.has(u));

  if (!src) return null;

  return (
    <img
      src={src}
      alt={speciesName}
      onError={() => setFailedUrls((prev) => new Set([...prev, src]))}
      className={`${sizeClass[size]} object-contain pixelated ${className}`}
      loading="lazy"
    />
  );
}
