import { Hono } from 'hono';

import { requirePermission } from '../../middleware/auth.js';
import {
  checkUpdateHandler,
  deleteConfigHandler,
  getVersionHandler,
  setConfigHandler,
  updateWebHandler,
} from './service.js';

export const configRoute = new Hono();

configRoute.use('*', requirePermission('module:config'));

configRoute.get('/version', getVersionHandler);
configRoute.get('/version/check', checkUpdateHandler);
configRoute.post('/version/update', updateWebHandler);
configRoute.post('/', setConfigHandler);
configRoute.delete('/:key', deleteConfigHandler);
