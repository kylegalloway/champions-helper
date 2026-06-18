import { Hono } from 'hono';
import { computeMatch } from '../db/queries/match';

const matchRouter = new Hono();

matchRouter.post('/', async (c) => {
  const { teamId } = await c.req.json<{ teamId: number }>();
  const result = await computeMatch(teamId);
  if (!result) return c.json({ error: 'Team not found' }, 404);
  return c.json(result);
});

export default matchRouter;
