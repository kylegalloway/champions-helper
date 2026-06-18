import { Hono } from 'hono';
import {
  getAllMetaTeams,
  getMetaTeamWithSlots,
  getAllRegulations,
  deleteMetaTeam,
  deleteAllMetaTeams,
  createRegulation,
  seedRegulationSpecies,
  getRegulationSpeciesCount,
} from '../db/queries/metaTeams';
import { db } from '../db/client';
import { regulations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { fetchRegulationSpecies } from '../scrapers/serebii';

const metaTeamsRouter = new Hono();

metaTeamsRouter.get('/', async (c) => {
  const regulation = c.req.query('regulation');
  const teams = await getAllMetaTeams(regulation);
  return c.json(teams);
});

metaTeamsRouter.get('/regulations', async (c) => {
  const regs = await getAllRegulations();
  const withCounts = await Promise.all(
    regs.map(async (r) => ({
      ...r,
      speciesCount: await getRegulationSpeciesCount(r.id),
    }))
  );
  return c.json(withCounts);
});

metaTeamsRouter.post('/regulations', async (c) => {
  const { name, validFrom, validTo } = await c.req.json<{
    name: string;
    validFrom?: string;
    validTo?: string;
  }>();
  if (!name?.trim()) return c.json({ error: 'name is required' }, 400);
  try {
    const reg = await createRegulation(name.trim(), validFrom, validTo);
    return c.json(reg, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 409);
  }
});

metaTeamsRouter.post('/regulations/:id/seed-species', async (c) => {
  const id = Number(c.req.param('id'));
  const reg = await db.select().from(regulations).where(eq(regulations.id, id)).get();
  if (!reg) return c.json({ error: 'Regulation not found' }, 404);

  try {
    const names = await fetchRegulationSpecies(reg.name);
    if (names.length === 0) {
      return c.json({ error: 'No species found from Serebii — the page format may have changed' }, 422);
    }
    const added = await seedRegulationSpecies(id, names);
    return c.json({ added, total: names.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 502);
  }
});

metaTeamsRouter.delete('/', async (c) => {
  const regulation = c.req.query('regulation');
  const deleted = await deleteAllMetaTeams(regulation);
  return c.json({ deleted });
});

metaTeamsRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const team = await getMetaTeamWithSlots(id);
  if (!team) return c.json({ error: 'Not found' }, 404);
  return c.json(team);
});

metaTeamsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const deleted = await deleteMetaTeam(id);
  if (!deleted) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});

export default metaTeamsRouter;
