import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const species = sqliteTable('species', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  pokiApiUrl: text('pokeapi_url'),
});

export const rosterEntries = sqliteTable('roster_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  speciesId: integer('species_id').notNull().references(() => species.id),
  nickname: text('nickname').notNull().default(''),
  move1: text('move1').notNull(),
  move2: text('move2').notNull(),
  move3: text('move3').notNull(),
  move4: text('move4').notNull(),
  ability: text('ability').notNull(),
  nature: text('nature').notNull(),
  spSpread: text('sp_spread').notNull(),
  isHomePokemon: integer('is_home_pokemon').notNull().default(0),
}, (t) => ({
  uniqSpeciesNickname: uniqueIndex('roster_entries_species_nickname').on(t.speciesId, t.nickname),
}));

export const regulations = sqliteTable('regulations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  validFrom: text('valid_from'),
  validTo: text('valid_to'),
});

export const regulationSpecies = sqliteTable('regulation_species', {
  regulationId: integer('regulation_id').notNull().references(() => regulations.id),
  speciesId: integer('species_id').notNull().references(() => species.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.regulationId, t.speciesId] }),
}));

export const metaTeams = sqliteTable('meta_teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  source: text('source').notNull(),
  sourceUrl: text('source_url'),
  regulationId: integer('regulation_id').references(() => regulations.id),
  isPartial: integer('is_partial').notNull().default(0),
  contentHash: text('content_hash'),
  rawJson: text('raw_json'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const metaTeamSlots = sqliteTable('meta_team_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull().references(() => metaTeams.id, { onDelete: 'cascade' }),
  slot: integer('slot').notNull(),
  speciesId: integer('species_id').notNull().references(() => species.id),
  move1: text('move1').notNull(),
  move2: text('move2').notNull(),
  move3: text('move3').notNull(),
  move4: text('move4').notNull(),
  ability: text('ability').notNull(),
  nature: text('nature').notNull(),
  spSpread: text('sp_spread').notNull(),
  item: text('item'),
  spSpreadEstimated: integer('sp_spread_estimated').notNull().default(0),
  natureEstimated: integer('nature_estimated').notNull().default(0),
}, (t) => ({
  uniqTeamSlot: uniqueIndex('meta_team_slots_team_slot').on(t.teamId, t.slot),
}));

export const importRuns = sqliteTable('import_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  url: text('url'),
  status: text('status').notNull(),
  message: text('message'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
