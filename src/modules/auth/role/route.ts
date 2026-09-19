import { Hono } from 'hono';

import { requirePermission } from '../../../middleware/auth.js';
import {
  createRoleHandler,
  deleteRoleHandler,
  getRoleHandler,
  listRolesHandler,
  updateRoleHandler,
} from './service.js';

export const roleRoute = new Hono();

roleRoute.use('*', requirePermission('module:auth'));

roleRoute.get('/', listRolesHandler);
roleRoute.post('/', createRoleHandler);
roleRoute.get('/:id', getRoleHandler);
roleRoute.patch('/:id', updateRoleHandler);
roleRoute.delete('/:id', deleteRoleHandler);
