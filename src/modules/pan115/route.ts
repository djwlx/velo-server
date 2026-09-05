import { Hono } from 'hono';

import { getRandomPic } from './services/pic.js';

export const pan115Route = new Hono();

pan115Route.get('/pic/random', getRandomPic);
