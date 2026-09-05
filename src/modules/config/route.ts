import { Hono } from 'hono';

import { deleteConfigHandler, setConfigHandler } from './service.js';

export const configRoute = new Hono();

configRoute.post('/', setConfigHandler);
configRoute.delete('/:key', deleteConfigHandler);
