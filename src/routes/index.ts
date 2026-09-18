import { Hono } from 'hono';

import { authMiddleware } from '../middleware/auth.js';
import { authRoute } from '../modules/auth/route.js';
import { configRoute } from '../modules/config/route.js';
import { pan115Route } from '../modules/pan115/route.js';

export const api = new Hono();
api.use('*', authMiddleware);
api.route('/auth', authRoute);
api.route('/115', pan115Route);
api.route('/config', configRoute);
