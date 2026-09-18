import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { users } from '../user/schema.js';

export const roles = sqliteTable('velo_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const userRoles = sqliteTable(
  'velo_user_roles',
  {
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const rolePermissions = sqliteTable(
  'velo_role_permissions',
  {
    roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionCode: text('permission_code').notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionCode] })],
);
