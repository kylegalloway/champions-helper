import { db } from '../client';
import { metaTeams, metaTeamSlots, species, regulations } from '../schema';
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

  const slotsByTeam = new Map<number, MetaTeamSlot[]>();
  for (const slot of allSlots) {
    const list = slotsByTeam.get(slot.teamId) ?? [];
    list.push(mapSlotRow(slot));
    slotsByTeam.set(slot.teamId, list);
  }

  return filtered.map((r) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    sourceUrl: r.sourceUrl,
    regulationId: r.regulationId,
    regulationName: r.regulationName,
    isPartial: r.isPartial === 1,
    contentHash: r.contentHash,
    createdAt: r.createdAt,
    slots: (slotsByTeam.get(r.id) ?? []).sort((a, b) => a.slot - b.slot),
  }));
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
  hash: string
): Promise<{ id: number; regulationName: string | null } | null> {
  const existing = await db
    .select({ id: metaTeams.id, regulationName: regulations.name })
    .from(metaTeams)
    .leftJoin(regulations, eq(metaTeams.regulationId, regulations.id))
    .where(eq(metaTeams.contentHash, hash))
    .get();

  return existing ?? null;
}

export async function saveMetaTeam(
  slots: ParsedSlot[],
  regulationName: string,
  source: string,
  opts: { name?: string; sourceUrl?: string; isPartial: boolean; rawJson?: string }
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

export async function getAllRegulations(): Promise<import('../../../shared/types').Regulation[]> {
  const rows = await db.select().from(regulations);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    validFrom: r.validFrom,
    validTo: r.validTo,
  }));
}
