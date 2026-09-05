import { Hono } from 'hono';

import { configRoute } from '../modules/config/route.js';
import { pan115Route } from '../modules/pan115/route.js';

export const api = new Hono();
api.route('/115', pan115Route);
api.route('/config', configRoute);
