import { Dex } from '@pkmn/dex';

const dex = Dex.forGen(9);
const DEX = 'https://play.pokemonshowdown.com/sprites/dex';
const ANI = 'https://play.pokemonshowdown.com/sprites/ani';

function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getSpriteUrls(speciesName: string): string[] {
  const formId = toId(speciesName);

  // Use @pkmn/dex to find the base species (e.g. "Charizard" for "Charizard-Mega-X")
  const species = dex.species.get(speciesName);
  const baseId =
    species?.exists && species.baseSpecies !== speciesName
      ? toId(species.baseSpecies)
      : null;

  // Try: form in dex → form animated → base in dex → base animated
  const urls: string[] = [`${DEX}/${formId}.png`, `${ANI}/${formId}.gif`];
  if (baseId) {
    urls.push(`${DEX}/${baseId}.png`, `${ANI}/${baseId}.gif`);
  }
  return urls;
}
