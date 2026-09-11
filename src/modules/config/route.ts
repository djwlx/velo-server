import { Hono } from 'hono';

import {
  deleteConfigHandler,
  getVersionHandler,
  setConfigHandler,
} from './service.js';

export const configRoute = new Hono();

configRoute.get('/version', getVersionHandler);
configRoute.post('/', setConfigHandler);
configRoute.delete('/:key', deleteConfigHandler);
