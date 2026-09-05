import { Hono } from 'hono';

import { injectCookie } from './middleware/cookie.js';
import { cacheFileIdInDB, getRandomPic } from './services/pic.js';
import type { Pan115Env } from './types.js';

export const pan115Route = new Hono<Pan115Env>();

pan115Route.use(injectCookie);

pan115Route.get('/pic/random', getRandomPic);
pan115Route.post('/pic/cache', cacheFileIdInDB);
