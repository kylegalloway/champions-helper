import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { fetchPokepaste, validatePokepasteUrl } from '../scrapers/pokepaste';
import { parseShowdownPaste } from '../scrapers/showdown';
import { saveMetaTeam, findDuplicateTeam, computeContentHash } from '../db/queries/metaTeams';
import { fetchUsageList, fetchSpeciesBuild, fetchTournamentTeams } from '../scrapers/pikalytics';
import { db } from '../db/client';
import { regulations, importRuns } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { ImportRequest, ImportPreview } from '../../shared/types';

const importRouter = new Hono();

importRouter.post('/', async (c) => {
  const body = await c.req.json<ImportRequest & { force?: boolean }>();
  const { type, url, paste, regulation, teamName, force } = body;

  if (!regulation) return c.json({ error: 'regulation is required' }, 400);

  const regRow = await db.select().from(regulations).where(eq(regulations.name, regulation)).get();
  if (!regRow) return c.json({ error: `Unknown regulation: ${regulation}` }, 400);

  let parseResult;
  try {
    if (type === 'pokepaste') {
      if (!url) return c.json({ error: 'url is required for pokepaste type' }, 400);
      validatePokepasteUrl(url);
      parseResult = await fetchPokepaste(url);
    } else if (type === 'showdown') {
      if (!paste) return c.json({ error: 'paste is required for showdown type' }, 400);
      parseResult = parseShowdownPaste(paste);
    } else {
      return c.json({ error: 'type must be pokepaste or showdown' }, 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }

  const hash = computeContentHash(parseResult.slots);
  const duplicate = await findDuplicateTeam(hash);

  if (duplicate && !force) {
    return c.json({
      duplicate: true,
      duplicateId: duplicate.id,
      duplicateRegulation: duplicate.regulationName,
      parseResult,
    }, 409);
  }

  const team = await saveMetaTeam(parseResult.slots, regulation, type, {
    name: teamName,
    sourceUrl: url,
    isPartial: parseResult.isPartial,
    rawJson: paste ?? undefined,
  });

  await db.insert(importRuns).values({
    source: type,
    url: url ?? null,
    status: 'success',
    message: `Imported team ${team.id} with ${parseResult.slots.length} slots`,
  });

  return c.json({ team, warnings: parseResult.warnings }, 201);
});

importRouter.post('/scrape', async (c) => {
  const { tournamentUrl, regulation = 'M-B' } = await c.req.json<{
    tournamentUrl: string;
    regulation?: string;
  }>();

  if (!tournamentUrl) {
    return c.json({ error: 'tournamentUrl is required' }, 400);
  }

  // Accept full URL or just the slug
  const slugMatch = tournamentUrl.match(/\/tournaments\/(?:rk9|limitless)\/([^/?#]+)/);
  const slug = slugMatch?.[1] ?? tournamentUrl.trim();

  return streamSSE(c, async (stream) => {
    const send = (type: string, message: string, extra?: object) =>
      stream.writeSSE({ data: JSON.stringify({ type, message, ...extra }) });

    try {
      await send('progress', `Fetching tournament page for "${slug}"...`);
      const results = await fetchTournamentTeams(slug, regulation);

      if (results.length === 0) {
        await send('done', 'No teams found on that tournament page.', { count: 0 });
        return;
      }

      await send('progress', `Found ${results.length} teams — saving...`);

      let saved = 0;
      const skipReasons = { empty: 0, duplicate: 0, error: 0 };

      for (let i = 0; i < results.length; i++) {
        const parseResult = results[i];
        const teamLabel = parseResult.playerName ? `Team ${i + 1} (${parseResult.playerName})` : `Team ${i + 1}`;

        if (parseResult.slots.length === 0) {
          await send('progress', `${teamLabel} skipped: no Pokémon parsed`);
          skipReasons.empty++;
          continue;
        }

        try {
          const hash = computeContentHash(parseResult.slots);
          const duplicate = await findDuplicateTeam(hash, tournamentUrl);
          if (duplicate) {
            await send('progress', `${teamLabel} skipped: duplicate of team #${duplicate.id}${duplicate.regulationName ? ` (${duplicate.regulationName})` : ''}`);
            skipReasons.duplicate++;
            continue;
          }

          const playerPart = parseResult.playerName
            ? `${parseResult.playerName}${parseResult.playerRecord ? ` [${parseResult.playerRecord}]` : ''}`
            : `Team ${i + 1}`;
          const teamName = `${slug} — ${playerPart}`;

          await saveMetaTeam(parseResult.slots, regulation, 'pikalytics', {
            name: teamName,
            sourceUrl: tournamentUrl,
            isPartial: parseResult.isPartial,
            rawJson: JSON.stringify(parseResult.slots),
            playerName: parseResult.playerName,
            playerRecord: parseResult.playerRecord,
          });
          saved++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await send('progress', `${teamLabel} skipped: ${msg}`);
          skipReasons.error++;
        }
      }

      const skipped = skipReasons.empty + skipReasons.duplicate + skipReasons.error;
      const skipSummary = [
        skipReasons.duplicate > 0 ? `${skipReasons.duplicate} duplicate` : '',
        skipReasons.empty > 0 ? `${skipReasons.empty} empty` : '',
        skipReasons.error > 0 ? `${skipReasons.error} error` : '',
      ].filter(Boolean).join(', ');

      await db.insert(importRuns).values({
        source: 'pikalytics-tournament',
        url: tournamentUrl,
        status: 'success',
        message: `Saved ${saved} teams (${skipped} skipped) from ${slug}`,
      });

      const doneMsg = skipped > 0
        ? `Done. ${saved} saved, ${skipped} skipped (${skipSummary}).`
        : `Done. ${saved} teams saved.`;
      await send('done', doneMsg, { count: saved });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await send('error', message);
    }
  });
});

export default importRouter;
