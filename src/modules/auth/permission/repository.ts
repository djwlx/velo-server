import { and, eq } from 'drizzle-orm';

import { ADMIN_ROLE, ALL_PERMISSIONS } from '../../../config/permissions.js';
import { db } from '../../../libs/db/index.js';
import { rolePermissions, roles, userRoles } from '../role/schema.js';

export const getUserPermissions = (userId: number): Set<string> =>
  db.select({ roleCode: roles.code }).from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, userId), eq(roles.code, ADMIN_ROLE))).get()
    ? new Set(ALL_PERMISSIONS)
    : new Set(
        db.select({ permissionCode: rolePermissions.permissionCode }).from(userRoles)
          .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
          .where(eq(userRoles.userId, userId)).all()
          .map(({ permissionCode }) => permissionCode),
      );

export const hasPermission = (userId: number, permissionCode: string): boolean =>
  getUserPermissions(userId).has(permissionCode);
