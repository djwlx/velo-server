import { and, count, eq, inArray } from 'drizzle-orm';

import type { Permission } from '../../../config/permissions.js';
import { ADMIN_ROLE } from '../../../config/permissions.js';
import { db } from '../../../libs/db/index.js';
import { users } from '../user/schema.js';
import { rolePermissions, roles, userRoles } from './schema.js';

type DbClient = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

export const createAdminRole = (client: DbClient, now: Date) => {
  const insertedRole = client
    .insert(roles)
    .values({ code: ADMIN_ROLE, name: 'Administrator', createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: roles.code })
    .returning({ id: roles.id })
    .get();
  return (
    insertedRole ??
    client.select({ id: roles.id }).from(roles).where(eq(roles.code, ADMIN_ROLE)).get()
  );
};

export const assignRole = (client: DbClient, userId: number, roleId: number): void => {
  client.insert(userRoles).values({ userId, roleId }).run();
};

export const grantPermissions = (
  client: DbClient,
  roleId: number,
  permissionCodes: readonly Permission[],
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

export const getUserRoleIds = (userId: number): number[] =>
  db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all()
    .map(({ roleId }) => roleId);

export const listRoles = () => db.select().from(roles).orderBy(roles.id).all();

export const getRoleById = (roleId: number) =>
  db.select().from(roles).where(eq(roles.id, roleId)).get();

export const getRoleByCode = (code: string) =>
  db.select().from(roles).where(eq(roles.code, code)).get();

export const getRolesByIds = (roleIds: number[]) =>
  roleIds.length ? db.select().from(roles).where(inArray(roles.id, roleIds)).all() : [];

export const createRole = (client: DbClient, code: string, name: string, now: Date) =>
  client
    .insert(roles)
    .values({ code, name, createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: roles.code })
    .returning()
    .get();

export const updateRole = (client: DbClient, roleId: number, name: string, now: Date) =>
  client.update(roles).set({ name, updatedAt: now }).where(eq(roles.id, roleId)).returning().get();

export const deleteRole = (client: DbClient, roleId: number): number =>
  client.delete(roles).where(eq(roles.id, roleId)).run().changes;

export const listRolePermissions = () => db.select().from(rolePermissions).all();

export const getRolePermissions = (roleId: number): string[] =>
  db
    .select({ permissionCode: rolePermissions.permissionCode })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId))
    .all()
    .map(({ permissionCode }) => permissionCode);

export const setRolePermissions = (
  client: DbClient,
  roleId: number,
  permissionCodes: readonly Permission[],
): void => {
  client.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId)).run();
  grantPermissions(client, roleId, permissionCodes);
};

export const setUserRoles = (client: DbClient, userId: number, roleIds: number[]): void => {
  client.delete(userRoles).where(eq(userRoles.userId, userId)).run();
  for (const roleId of roleIds) {
    client.insert(userRoles).values({ userId, roleId }).run();
  }
};

export const listRoleUserCounts = () =>
  db
    .select({ roleId: userRoles.roleId, value: count() })
    .from(userRoles)
    .groupBy(userRoles.roleId)
    .all();

export const countRoleUsers = (roleId: number): number =>
  db.select({ value: count() }).from(userRoles).where(eq(userRoles.roleId, roleId)).get()?.value ??
  0;

export const isLastActiveAdmin = (userId: number): boolean => {
  const activeAdmins = db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(and(eq(roles.code, ADMIN_ROLE), eq(users.status, 'active')))
    .all();
  return activeAdmins.length === 1 && activeAdmins[0].userId === userId;
};
