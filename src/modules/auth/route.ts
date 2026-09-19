import { Hono } from 'hono';

import { permissionRoute } from './permission/route.js';
import { roleRoute } from './role/route.js';
import { userRoute } from './user/route.js';
import { loginHandler, meHandler, registerHandler, updateMeHandler } from './user/service.js';

export const authRoute = new Hono();

authRoute.post('/register', registerHandler);
authRoute.post('/login', loginHandler);
authRoute.get('/me', meHandler);
authRoute.patch('/me', updateMeHandler);

authRoute.route('/users', userRoute);
authRoute.route('/roles', roleRoute);
authRoute.route('/permissions', permissionRoute);
