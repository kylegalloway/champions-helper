import * as XLSX from 'xlsx';
import { join } from 'path';
import { db } from '../server/db/client';
import { species, rosterEntries, importRuns } from '../server/db/schema';
import { eq } from 'drizzle-orm';

const EXCEL_PATH = join(process.cwd(), 'Pokemon Champions.xlsx');

interface ExcelRow {
  Pokemon: string;
  Move1: string;
  Move2: string;
  Move3: string;
  Move4: string;
  Ability: string;
  SPs: string | number;
  Nature: string;
  'Pkmn Home': boolean | string | number;
  Default?: unknown;
}

function normalizeSP(raw: string | number | undefined): string {
  if (!raw && raw !== 0) return '0/0/0/0/0/0';
  const s = String(raw).trim();
  if (!s || s === '0') return '0/0/0/0/0/0';
  const parts = s.split('/');
  if (parts.length !== 6) return '0/0/0/0/0/0';
  return parts.map((p) => String(parseInt(p.trim(), 10) || 0)).join('/');
}

function normalizeHome(raw: boolean | string | number | undefined): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw === '1';
  if (typeof raw === 'number') return raw === 1;
  return false;
}

async function upsertSpecies(name: string): Promise<number> {
  const existing = await db.select({ id: species.id }).from(species).where(eq(species.name, name)).get();
  if (existing) return existing.id;
  const [inserted] = await db.insert(species).values({ name }).returning({ id: species.id });
  return inserted.id;
}

async function main() {
  console.log(`Reading ${EXCEL_PATH}...`);

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[1]; // Sheet2 (index 1)
  if (!sheetName) {
    throw new Error(`Sheet2 not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

  console.log(`Found ${rows.length} rows in ${sheetName}`);

  const warnings: string[] = [];
  let imported = 0;

  for (const row of rows) {
    const pokemonName = String(row.Pokemon ?? '').trim();
    if (!pokemonName) continue;

    const spSpread = normalizeSP(row.SPs);

    // Warn about Froslass with all-zero SPs (as noted in handoff)
    if (pokemonName === 'Froslass' && spSpread === '0/0/0/0/0/0') {
      warnings.push(`Froslass imported with SPs=0/0/0/0/0/0 — please review`);
    }

    // Warn about any zero SP spread (might indicate data issue)
    if (spSpread === '0/0/0/0/0/0' && String(row.SPs ?? '').includes('/')) {
      warnings.push(`${pokemonName}: SPs parsed as all-zeros from "${row.SPs}" — review`);
    }

    const speciesId = await upsertSpecies(pokemonName);

    try {
      await db.insert(rosterEntries).values({
        speciesId,
        nickname: '',
        move1: String(row.Move1 ?? '').trim(),
        move2: String(row.Move2 ?? '').trim(),
        move3: String(row.Move3 ?? '').trim(),
        move4: String(row.Move4 ?? '').trim(),
        ability: String(row.Ability ?? '').trim(),
        nature: String(row.Nature ?? '').trim(),
        spSpread,
        isHomePokemon: normalizeHome(row['Pkmn Home']) ? 1 : 0,
      });
      console.log(`  Imported ${pokemonName}`);
      imported++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`${pokemonName}: insert failed — ${msg}`);
      console.warn(`  Skipped ${pokemonName}: ${msg}`);
    }
  }

  const message = [
    `Imported ${imported}/${rows.length} Pokemon`,
    ...warnings.map((w) => `WARNING: ${w}`),
  ].join('\n');

  await db.insert(importRuns).values({
    source: 'excel',
    url: EXCEL_PATH,
    status: warnings.length > 0 ? 'warning' : 'success',
    message,
  });

  console.log(`\nDone: ${imported} imported, ${warnings.length} warnings`);
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach((w) => console.log(' -', w));
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
