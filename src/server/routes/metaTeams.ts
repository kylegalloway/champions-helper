import { Hono } from 'hono';
import {
  getAllMetaTeams,
  getMetaTeamWithSlots,
  getAllRegulations,
} from '../db/queries/metaTeams';

const metaTeamsRouter = new Hono();

metaTeamsRouter.get('/', async (c) => {
  const regulation = c.req.query('regulation');
  const teams = await getAllMetaTeams(regulation);
  return c.json(teams);
});

metaTeamsRouter.get('/regulations', async (c) => {
  const regs = await getAllRegulations();
  return c.json(regs);
});

metaTeamsRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const team = await getMetaTeamWithSlots(id);
  if (!team) return c.json({ error: 'Not found' }, 404);
  return c.json(team);
});

export default metaTeamsRouter;
