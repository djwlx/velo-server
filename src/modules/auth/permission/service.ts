import type { Handler } from 'hono';

import { ErrorCode } from '../../../config/error-code.js';
import { PERMISSIONS } from '../../../config/permissions.js';
import { fail, success } from '../../../utils/response.js';
import { hasPermission } from './repository.js';

export { hasPermission };

export const listPermissionsHandler: Handler = (c) => c.json(success({ list: PERMISSIONS }));

export const getPermissionHandler: Handler = (c) => {
  const code = c.req.param('code');
  const permission = PERMISSIONS.find((item) => item.code === code);
  if (!permission) return c.json(fail('permissionNotFound', ErrorCode.ResourceNotFound), 404);
  return c.json(success({ permission }));
};
