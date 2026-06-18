import { Hono } from 'hono';
import {
  getAllRosterEntries,
  createRosterEntry,
  updateRosterEntry,
  deleteRosterEntry,
} from '../db/queries/roster';

const roster = new Hono();

roster.get('/', async (c) => {
  const entries = await getAllRosterEntries();
  return c.json(entries);
});

roster.post('/', async (c) => {
  const body = await c.req.json();
  const entry = await createRosterEntry(body);
  return c.json(entry, 201);
});

roster.put('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const entry = await updateRosterEntry(id, body);
  if (!entry) return c.json({ error: 'Not found' }, 404);
  return c.json(entry);
});

roster.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await deleteRosterEntry(id);
  return c.json({ ok: true });
});

export default roster;
