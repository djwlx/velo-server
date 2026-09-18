import { Hono } from 'hono';

import { requirePermission } from '../../middleware/auth.js';
import { injectCookie } from './middleware/cookie.js';
import { getFile, getFiles } from './services/files.js';
import { cacheFileIdInDB, clearPicsHandler, getRandomPic } from './services/pic.js';
import type { Pan115Env } from './types.js';

export const pan115Route = new Hono<Pan115Env>();

pan115Route.use(injectCookie);

pan115Route.get('/pic/random', getRandomPic);
pan115Route.use('*', requirePermission('module:115'));

pan115Route.get('/files/:cid', getFiles);
pan115Route.get('/file/:pickCode', getFile);
pan115Route.post('/pic/cache', cacheFileIdInDB);
pan115Route.delete('/pic', clearPicsHandler);
