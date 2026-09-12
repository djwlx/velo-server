import { Hono } from 'hono';

import {
  checkUpdateHandler,
  deleteConfigHandler,
  getVersionHandler,
  setConfigHandler,
  updateWebHandler,
} from './service.js';

export const configRoute = new Hono();

configRoute.get('/version', getVersionHandler);
configRoute.get('/version/check', checkUpdateHandler);
configRoute.post('/version/update', updateWebHandler);
configRoute.post('/', setConfigHandler);
configRoute.delete('/:key', deleteConfigHandler);
