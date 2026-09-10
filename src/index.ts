import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';

import { loggerMiddleware } from './middleware/logger.js';
import { api } from './routes/index.js';

const app = new Hono();

app.use('*', cors({ origin: '*' }));
app.use(requestId());

app.use(loggerMiddleware());

app.route('/api', api);

app.use('*', serveStatic({ root: './public' }));
app.get('*', (c, next) => {
  if (c.req.path.startsWith('/api')) return next();
  return serveStatic({ root: './public', path: 'index.html' })(c, next);
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on port:${info.port}`);
  },
);
