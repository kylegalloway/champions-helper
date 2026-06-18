import { fetchUsageList, fetchSpeciesBuild } from './pikalytics';
import { db } from '../db/client';
import { species as speciesTable, metaTeams, metaTeamSlots, importRuns, regulations } from '../db/schema';
import { eq } from 'drizzle-orm';

const FORMAT_CODE = 'battledataregmbs3';
const REGULATION = 'M-B';

async function upsertSpecies(name: string): Promise<number> {
  const existing = await db.select().from(speciesTable).where(eq(speciesTable.name, name)).get();
  if (existing) return existing.id;
  const [inserted] = await db.insert(speciesTable).values({ name }).returning({ id: speciesTable.id });
  return inserted.id;
}

async function getOrCreateRegulation(name: string): Promise<number> {
  const existing = await db.select().from(regulations).where(eq(regulations.name, name)).get();
  if (existing) return existing.id;
  const [inserted] = await db.insert(regulations).values({ name }).returning({ id: regulations.id });
  return inserted.id;
}

async function main() {
  console.log(`Scraping Pikalytics ${FORMAT_CODE}...`);

  const regulationId = await getOrCreateRegulation(REGULATION);
  const usageList = await fetchUsageList(FORMAT_CODE);
  console.log(`Found ${usageList.length} species in usage list`);

  for (const entry of usageList.slice(0, 20)) {
    console.log(`Fetching build for ${entry.speciesName}...`);
    try {
      const build = await fetchSpeciesBuild(FORMAT_CODE, entry.speciesName);
      const speciesId = await upsertSpecies(build.speciesName);

      if (build.spreads.length > 0 && build.moves.length >= 4) {
        const spread = build.spreads[0].spread;
        const nature = build.natures[0] ?? 'Hardy';
        const ability = build.abilities[0] ?? '';

        await db.insert(metaTeams).values({
          name: `Pikalytics ${build.speciesName} #1`,
          source: 'pikalytics',
          sourceUrl: `https://pikalytics.com/ai/pokedex/${FORMAT_CODE}/${entry.speciesName.toLowerCase()}`,
          regulationId,
          isPartial: 1,
          rawJson: JSON.stringify(build),
        });

        console.log(`  Saved build for ${build.speciesName}`);
      }
    } catch (err) {
      console.error(`  Error fetching ${entry.speciesName}:`, err);
    }
  }

  await db.insert(importRuns).values({
    source: 'pikalytics',
    status: 'success',
    message: `Scraped ${usageList.length} species from ${FORMAT_CODE}`,
  });

  console.log('Done!');
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
