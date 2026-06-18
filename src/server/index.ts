import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import rosterRouter from './routes/roster';
import metaTeamsRouter from './routes/metaTeams';
import matchRouter from './routes/match';
import importRouter from './routes/import';

// Import DB to trigger auto-migration on startup
import './db/client';

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors({ origin: 'http://localhost:5173' }));

app.route('/api/roster', rosterRouter);
app.route('/api/meta-teams', metaTeamsRouter);
app.route('/api/match', matchRouter);
app.route('/api/import', importRouter);

app.get('/health', (c) => c.json({ ok: true }));

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log('Champions Helper server running on http://localhost:3000');
