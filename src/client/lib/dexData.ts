import { Dex } from '@pkmn/dex';

const dex = Dex.forGen(9);

export const allSpeciesNames: string[] = [...dex.species.all()]
  .filter((s) => s.exists && !s.isNonstandard)
  .map((s) => s.name)
  .sort();

export const allNatureNames: string[] = [...dex.natures.all()]
  .map((n) => n.name)
  .sort();

export const allMoveNames: string[] = [...dex.moves.all()]
  .filter((m) => m.exists && !m.isNonstandard)
  .map((m) => m.name)
  .sort();

export const allAbilityNames: string[] = [...dex.abilities.all()]
  .filter((a) => a.exists && !a.isNonstandard)
  .map((a) => a.name)
  .sort();
