import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';

import { loggerMiddleware } from './middleware/logger.js';
import { api } from './routes/index.js';
import { getAppVersion } from './utils/version.js';

const app = new Hono();

app.use('*', cors({ origin: '*' }));
app.use(requestId());

app.use(loggerMiddleware());

app.get('/', (c) => {
  return c.text(`Hello velo! v${getAppVersion()}`);
});
app.route('/api', api);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on port:${info.port}`);
  },
);
