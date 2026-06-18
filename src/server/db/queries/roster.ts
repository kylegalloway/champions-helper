import { db } from '../client';
import { rosterEntries, species } from '../schema';
import { eq } from 'drizzle-orm';
import type { RosterEntry } from '../../../shared/types';

function mapRow(row: typeof rosterEntries.$inferSelect & { speciesName: string }): RosterEntry {
  return {
    id: row.id,
    speciesId: row.speciesId,
    speciesName: row.speciesName,
    nickname: row.nickname,
    move1: row.move1,
    move2: row.move2,
    move3: row.move3,
    move4: row.move4,
    ability: row.ability,
    nature: row.nature,
    spSpread: row.spSpread,
    isHomePokemon: row.isHomePokemon === 1,
  };
}

export async function getAllRosterEntries(): Promise<RosterEntry[]> {
  const rows = await db
    .select({
      id: rosterEntries.id,
      speciesId: rosterEntries.speciesId,
      speciesName: species.name,
      nickname: rosterEntries.nickname,
      move1: rosterEntries.move1,
      move2: rosterEntries.move2,
      move3: rosterEntries.move3,
      move4: rosterEntries.move4,
      ability: rosterEntries.ability,
      nature: rosterEntries.nature,
      spSpread: rosterEntries.spSpread,
      isHomePokemon: rosterEntries.isHomePokemon,
    })
    .from(rosterEntries)
    .innerJoin(species, eq(rosterEntries.speciesId, species.id));

  return rows.map(mapRow);
}

export async function getRosterEntriesBySpecies(speciesName: string): Promise<RosterEntry[]> {
  const rows = await db
    .select({
      id: rosterEntries.id,
      speciesId: rosterEntries.speciesId,
      speciesName: species.name,
      nickname: rosterEntries.nickname,
      move1: rosterEntries.move1,
      move2: rosterEntries.move2,
      move3: rosterEntries.move3,
      move4: rosterEntries.move4,
      ability: rosterEntries.ability,
      nature: rosterEntries.nature,
      spSpread: rosterEntries.spSpread,
      isHomePokemon: rosterEntries.isHomePokemon,
    })
    .from(rosterEntries)
    .innerJoin(species, eq(rosterEntries.speciesId, species.id))
    .where(eq(species.name, speciesName));

  return rows.map(mapRow);
}

export interface CreateRosterInput {
  speciesName: string;
  nickname?: string;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  ability: string;
  nature: string;
  spSpread: string;
  isHomePokemon?: boolean;
}

export async function upsertSpecies(name: string): Promise<number> {
  const existing = await db.select({ id: species.id }).from(species).where(eq(species.name, name)).get();
  if (existing) return existing.id;
  const [inserted] = await db.insert(species).values({ name }).returning({ id: species.id });
  return inserted.id;
}

export async function createRosterEntry(input: CreateRosterInput): Promise<RosterEntry> {
  const speciesId = await upsertSpecies(input.speciesName);
  const [row] = await db
    .insert(rosterEntries)
    .values({
      speciesId,
      nickname: input.nickname ?? '',
      move1: input.move1,
      move2: input.move2,
      move3: input.move3,
      move4: input.move4,
      ability: input.ability,
      nature: input.nature,
      spSpread: input.spSpread,
      isHomePokemon: input.isHomePokemon ? 1 : 0,
    })
    .returning();

  return {
    id: row.id,
    speciesId: row.speciesId,
    speciesName: input.speciesName,
    nickname: row.nickname,
    move1: row.move1,
    move2: row.move2,
    move3: row.move3,
    move4: row.move4,
    ability: row.ability,
    nature: row.nature,
    spSpread: row.spSpread,
    isHomePokemon: row.isHomePokemon === 1,
  };
}

export async function updateRosterEntry(id: number, input: Partial<CreateRosterInput>): Promise<RosterEntry | null> {
  const updates: Partial<typeof rosterEntries.$inferInsert> = {};

  if (input.speciesName !== undefined) {
    updates.speciesId = await upsertSpecies(input.speciesName);
  }
  if (input.nickname !== undefined) updates.nickname = input.nickname;
  if (input.move1 !== undefined) updates.move1 = input.move1;
  if (input.move2 !== undefined) updates.move2 = input.move2;
  if (input.move3 !== undefined) updates.move3 = input.move3;
  if (input.move4 !== undefined) updates.move4 = input.move4;
  if (input.ability !== undefined) updates.ability = input.ability;
  if (input.nature !== undefined) updates.nature = input.nature;
  if (input.spSpread !== undefined) updates.spSpread = input.spSpread;
  if (input.isHomePokemon !== undefined) updates.isHomePokemon = input.isHomePokemon ? 1 : 0;

  await db.update(rosterEntries).set(updates).where(eq(rosterEntries.id, id));

  const entries = await getAllRosterEntries();
  return entries.find((e) => e.id === id) ?? null;
}

export async function deleteRosterEntry(id: number): Promise<void> {
  await db.delete(rosterEntries).where(eq(rosterEntries.id, id));
}
