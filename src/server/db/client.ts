import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { count } from 'drizzle-orm';
import * as schema from './schema';
import { mkdirSync } from 'fs';
import { join } from 'path';

const dataDir = join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(join(dataDir, 'champions.db'), { create: true });
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

const migrationsFolder = join(import.meta.dir, 'migrations');
migrate(db, { migrationsFolder });

// Seed known regulations on first run
const [{ total }] = await db.select({ total: count() }).from(schema.regulations);
if (total === 0) {
  await db.insert(schema.regulations).values([
    { name: 'M-A', validFrom: '2024-01-01' },
    { name: 'M-B', validFrom: '2024-06-01' },
    { name: 'M-C', validFrom: '2024-10-01' },
  ]);
}
