import { eq } from 'drizzle-orm';

import type { Permission } from '../../../config/permissions.js';
import { ADMIN_ROLE } from '../../../config/permissions.js';
import { db } from '../../../libs/db/index.js';
import { rolePermissions, roles, userRoles } from './schema.js';

type DbClient = Pick<typeof db, 'select' | 'insert'>;

export const createAdminRole = (client: DbClient, now: Date) => {
  const insertedRole = client.insert(roles)
    .values({ code: ADMIN_ROLE, name: 'Administrator', createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: roles.code }).returning({ id: roles.id }).get();
  return insertedRole ?? client.select({ id: roles.id }).from(roles)
    .where(eq(roles.code, ADMIN_ROLE)).get();
};

export const assignRole = (client: DbClient, userId: number, roleId: number): void => {
  client.insert(userRoles).values({ userId, roleId }).run();
};

export const grantPermissions = (
  client: DbClient, roleId: number, permissionCodes: readonly Permission[],
): void => {
  for (const permissionCode of permissionCodes) {
    client.insert(rolePermissions).values({ roleId, permissionCode }).run();
  }
};

export const getUserRoles = (userId: number) =>
  db
    .select({ code: roles.code, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .all();
