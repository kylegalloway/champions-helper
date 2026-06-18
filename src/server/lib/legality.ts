import { db } from '../db/client';
import { regulationSpecies, regulations, species } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function getLegalRegulations(teamSpeciesNames: string[]): Promise<string[]> {
  if (teamSpeciesNames.length === 0) return [];

  const speciesRows = await db
    .select({ id: species.id, name: species.name })
    .from(species)
    .where(inArray(species.name, teamSpeciesNames));

  const speciesIdMap = new Map(speciesRows.map((s) => [s.name, s.id]));
  const teamSpeciesIds = teamSpeciesNames.map((n) => speciesIdMap.get(n)).filter(Boolean) as number[];

  if (teamSpeciesIds.length !== teamSpeciesNames.length) return [];

  const allRegs = await db.select().from(regulations);
  const legalRegs: string[] = [];

  for (const reg of allRegs) {
    const allowed = await db
      .select({ speciesId: regulationSpecies.speciesId })
      .from(regulationSpecies)
      .where(eq(regulationSpecies.regulationId, reg.id));

    const allowedIds = new Set(allowed.map((r) => r.speciesId));
    if (teamSpeciesIds.every((id) => allowedIds.has(id))) {
      legalRegs.push(reg.name);
    }
  }

  return legalRegs;
}
