import { Hono } from 'hono';

import { loginHandler, meHandler, registerHandler } from './user/service.js';

export const authRoute = new Hono();

authRoute.post('/register', registerHandler);
authRoute.post('/login', loginHandler);
authRoute.get('/me', meHandler);
