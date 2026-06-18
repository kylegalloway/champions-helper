import { db } from '../client';
import { metaTeams, metaTeamSlots, species, regulations, regulationSpecies } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { MetaTeam, MetaTeamSlot, ParsedSlot } from '../../../shared/types';
import { upsertSpecies } from './roster';
import { createHash } from 'crypto';

function mapSlotRow(
  row: typeof metaTeamSlots.$inferSelect & { speciesName: string }
): MetaTeamSlot {
  return {
    id: row.id,
    teamId: row.teamId,
    slot: row.slot,
    speciesId: row.speciesId,
    speciesName: row.speciesName,
    move1: row.move1,
    move2: row.move2,
    move3: row.move3,
    move4: row.move4,
    ability: row.ability,
    nature: row.nature,
    spSpread: row.spSpread,
    spSpreadEstimated: row.spSpreadEstimated === 1,
    natureEstimated: row.natureEstimated === 1,
    item: row.item,
  };
}

export async function getAllMetaTeams(regulationName?: string): Promise<MetaTeam[]> {
  const rows = await db
    .select({
      id: metaTeams.id,
      name: metaTeams.name,
      source: metaTeams.source,
      sourceUrl: metaTeams.sourceUrl,
      regulationId: metaTeams.regulationId,
      regulationName: regulations.name,
      isPartial: metaTeams.isPartial,
      contentHash: metaTeams.contentHash,
      playerName: metaTeams.playerName,
      playerRecord: metaTeams.playerRecord,
      createdAt: metaTeams.createdAt,
    })
    .from(metaTeams)
    .leftJoin(regulations, eq(metaTeams.regulationId, regulations.id));

  const filtered = rows.filter((r) => !regulationName || r.regulationName === regulationName);

  // Fetch slots for all teams in one query
  const teamIds = filtered.map((r) => r.id);
  const allSlots =
    teamIds.length === 0
      ? []
      : await db
          .select({
            id: metaTeamSlots.id,
            teamId: metaTeamSlots.teamId,
            slot: metaTeamSlots.slot,
            speciesId: metaTeamSlots.speciesId,
            speciesName: species.name,
            move1: metaTeamSlots.move1,
            move2: metaTeamSlots.move2,
            move3: metaTeamSlots.move3,
            move4: metaTeamSlots.move4,
            ability: metaTeamSlots.ability,
            nature: metaTeamSlots.nature,
            spSpread: metaTeamSlots.spSpread,
            spSpreadEstimated: metaTeamSlots.spSpreadEstimated,
            natureEstimated: metaTeamSlots.natureEstimated,
            item: metaTeamSlots.item,
          })
          .from(metaTeamSlots)
          .innerJoin(species, eq(metaTeamSlots.speciesId, species.id))
          .where(inArray(metaTeamSlots.teamId, teamIds));

  const slotsByTeam = new Map<number, (MetaTeamSlot & { speciesId: number })[]>();
  for (const slot of allSlots) {
    const list = slotsByTeam.get(slot.teamId) ?? [];
    list.push({ ...mapSlotRow(slot), speciesId: slot.speciesId });
    slotsByTeam.set(slot.teamId, list);
  }

  // If filtering by regulation, load its allowed species set for legality badges
  let allowedSpeciesSet: Set<number> | null = null;
  if (regulationName) {
    const regRow = await db.select().from(regulations).where(eq(regulations.name, regulationName)).get();
    if (regRow) {
      const regSpeciesRows = await db
        .select({ speciesId: regulationSpecies.speciesId })
        .from(regulationSpecies)
        .where(eq(regulationSpecies.regulationId, regRow.id));
      if (regSpeciesRows.length > 0) {
        allowedSpeciesSet = new Set(regSpeciesRows.map((r) => r.speciesId));
      }
    }
  }

  return filtered.map((r) => {
    const slots = (slotsByTeam.get(r.id) ?? []).sort((a, b) => a.slot - b.slot);
    let isLegal: boolean | null = null;
    if (allowedSpeciesSet) {
      isLegal = slots.every((s) => allowedSpeciesSet!.has(s.speciesId));
    }
    return {
      id: r.id,
      name: r.name,
      source: r.source,
      sourceUrl: r.sourceUrl,
      regulationId: r.regulationId,
      regulationName: r.regulationName,
      isPartial: r.isPartial === 1,
      contentHash: r.contentHash,
      playerName: r.playerName,
      playerRecord: r.playerRecord,
      isLegal,
      createdAt: r.createdAt,
      slots: slots.map(({ speciesId: _id, ...rest }) => rest) as MetaTeamSlot[],
    };
  });
}

export async function getMetaTeamWithSlots(teamId: number): Promise<MetaTeam | null> {
  const team = await db
    .select({
      id: metaTeams.id,
      name: metaTeams.name,
      source: metaTeams.source,
      sourceUrl: metaTeams.sourceUrl,
      regulationId: metaTeams.regulationId,
      regulationName: regulations.name,
      isPartial: metaTeams.isPartial,
      contentHash: metaTeams.contentHash,
      playerName: metaTeams.playerName,
      playerRecord: metaTeams.playerRecord,
      createdAt: metaTeams.createdAt,
    })
    .from(metaTeams)
    .leftJoin(regulations, eq(metaTeams.regulationId, regulations.id))
    .where(eq(metaTeams.id, teamId))
    .get();

  if (!team) return null;

  const slotRows = await db
    .select({
      id: metaTeamSlots.id,
      teamId: metaTeamSlots.teamId,
      slot: metaTeamSlots.slot,
      speciesId: metaTeamSlots.speciesId,
      speciesName: species.name,
      move1: metaTeamSlots.move1,
      move2: metaTeamSlots.move2,
      move3: metaTeamSlots.move3,
      move4: metaTeamSlots.move4,
      ability: metaTeamSlots.ability,
      nature: metaTeamSlots.nature,
      spSpread: metaTeamSlots.spSpread,
      spSpreadEstimated: metaTeamSlots.spSpreadEstimated,
      natureEstimated: metaTeamSlots.natureEstimated,
      item: metaTeamSlots.item,
    })
    .from(metaTeamSlots)
    .innerJoin(species, eq(metaTeamSlots.speciesId, species.id))
    .where(eq(metaTeamSlots.teamId, teamId))
    .orderBy(metaTeamSlots.slot);

  return {
    id: team.id,
    name: team.name,
    source: team.source,
    sourceUrl: team.sourceUrl,
    regulationId: team.regulationId,
    regulationName: team.regulationName,
    isPartial: team.isPartial === 1,
    contentHash: team.contentHash,
    playerName: team.playerName,
    playerRecord: team.playerRecord,
    createdAt: team.createdAt,
    slots: slotRows.map(mapSlotRow),
  };
}

export function computeContentHash(slots: ParsedSlot[]): string {
  const normalized = slots.map((s) => ({
    species: s.speciesName,
    ability: s.ability,
    nature: s.nature,
    spSpread: s.spSpread,
    moves: [s.move1, s.move2, s.move3, s.move4].sort(),
  }));
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16);
}

export async function findDuplicateTeam(
  hash: string,
  sourceUrl?: string
): Promise<{ id: number; regulationName: string | null } | null> {
  const condition = sourceUrl
    ? and(eq(metaTeams.contentHash, hash), eq(metaTeams.sourceUrl, sourceUrl))
    : eq(metaTeams.contentHash, hash);

  const existing = await db
    .select({ id: metaTeams.id, regulationName: regulations.name })
    .from(metaTeams)
    .leftJoin(regulations, eq(metaTeams.regulationId, regulations.id))
    .where(condition)
    .get();

  return existing ?? null;
}

export async function saveMetaTeam(
  slots: ParsedSlot[],
  regulationName: string,
  source: string,
  opts: { name?: string; sourceUrl?: string; isPartial: boolean; rawJson?: string; playerName?: string; playerRecord?: string }
): Promise<MetaTeam> {
  const hash = computeContentHash(slots);

  const regRow = await db.select().from(regulations).where(eq(regulations.name, regulationName)).get();
  if (!regRow) throw new Error(`Unknown regulation: ${regulationName}`);

  const [team] = await db
    .insert(metaTeams)
    .values({
      name: opts.name ?? null,
      source,
      sourceUrl: opts.sourceUrl ?? null,
      regulationId: regRow.id,
      isPartial: opts.isPartial ? 1 : 0,
      contentHash: hash,
      rawJson: opts.rawJson ?? null,
      playerName: opts.playerName ?? null,
      playerRecord: opts.playerRecord ?? null,
    })
    .returning();

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const speciesId = await upsertSpecies(slot.speciesName);
    await db.insert(metaTeamSlots).values({
      teamId: team.id,
      slot: i + 1,
      speciesId,
      move1: slot.move1,
      move2: slot.move2,
      move3: slot.move3,
      move4: slot.move4,
      ability: slot.ability,
      nature: slot.nature,
      spSpread: slot.spSpread,
      spSpreadEstimated: slot.spSpreadEstimated ? 1 : 0,
      natureEstimated: slot.natureEstimated ? 1 : 0,
      item: slot.item ?? null,
    });
  }

  return (await getMetaTeamWithSlots(team.id))!;
}

export async function deleteMetaTeam(teamId: number): Promise<boolean> {
  const result = await db.delete(metaTeams).where(eq(metaTeams.id, teamId)).returning({ id: metaTeams.id });
  return result.length > 0;
}

export async function deleteAllMetaTeams(regulationName?: string): Promise<number> {
  if (regulationName) {
    const regRow = await db.select().from(regulations).where(eq(regulations.name, regulationName)).get();
    if (!regRow) return 0;
    const result = await db.delete(metaTeams).where(eq(metaTeams.regulationId, regRow.id)).returning({ id: metaTeams.id });
    return result.length;
  }
  const result = await db.delete(metaTeams).returning({ id: metaTeams.id });
  return result.length;
}

export async function getAllRegulations(): Promise<import('../../../shared/types').Regulation[]> {
  const rows = await db.select().from(regulations);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    validFrom: r.validFrom,
    validTo: r.validTo,
  }));
}

export async function seedRegulationSpecies(
  regulationId: number,
  speciesNames: string[]
): Promise<number> {
  let added = 0;
  for (const name of speciesNames) {
    const speciesId = await upsertSpecies(name);
    const exists = await db
      .select()
      .from(regulationSpecies)
      .where(and(
        eq(regulationSpecies.regulationId, regulationId),
        eq(regulationSpecies.speciesId, speciesId)
      ))
      .get();
    if (!exists) {
      await db.insert(regulationSpecies).values({ regulationId, speciesId });
      added++;
    }
  }
  return added;
}

export async function getRegulationSpeciesCount(regulationId: number): Promise<number> {
  const rows = await db
    .select()
    .from(regulationSpecies)
    .where(eq(regulationSpecies.regulationId, regulationId));
  return rows.length;
}

export async function isTeamLegalForRegulation(
  teamSpeciesIds: number[],
  regulationId: number
): Promise<boolean | null> {
  const count = await getRegulationSpeciesCount(regulationId);
  if (count === 0) return null;

  const allowed = await db
    .select({ speciesId: regulationSpecies.speciesId })
    .from(regulationSpecies)
    .where(eq(regulationSpecies.regulationId, regulationId));

  const allowedSet = new Set(allowed.map((r) => r.speciesId));
  return teamSpeciesIds.every((id) => allowedSet.has(id));
}

export async function createRegulation(
  name: string,
  validFrom?: string,
  validTo?: string
): Promise<import('../../../shared/types').Regulation> {
  const [row] = await db
    .insert(regulations)
    .values({ name, validFrom: validFrom ?? null, validTo: validTo ?? null })
    .returning();
  return { id: row.id, name: row.name, validFrom: row.validFrom, validTo: row.validTo };
}
