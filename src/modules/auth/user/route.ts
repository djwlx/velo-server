import { Hono } from 'hono';

import { requirePermission } from '../../../middleware/auth.js';
import {
  createUserHandler,
  deleteUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
} from './service.js';

export const userRoute = new Hono();

userRoute.use('*', requirePermission('module:auth'));

userRoute.get('/', listUsersHandler);
userRoute.post('/', createUserHandler);
userRoute.get('/:id', getUserHandler);
userRoute.patch('/:id', updateUserHandler);
userRoute.delete('/:id', deleteUserHandler);
