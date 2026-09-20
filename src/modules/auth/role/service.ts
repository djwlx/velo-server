import type { Handler } from 'hono';

import { ErrorCode } from '../../../config/error-code.js';
import type { Permission } from '../../../config/permissions.js';
import { ADMIN_ROLE, ALL_PERMISSIONS } from '../../../config/permissions.js';
import { db } from '../../../libs/db/index.js';
import { fail, success } from '../../../utils/response.js';
import {
  countRoleUsers,
  createRole,
  deleteRole,
  getRoleByCode,
  getRoleById,
  getRolePermissions,
  listRolePermissions,
  listRoleUserCounts,
  listRoles,
  setRolePermissions,
  updateRole,
} from './repository.js';
import type { roles } from './schema.js';

type Role = typeof roles.$inferSelect;

const MAX_CODE_LENGTH = 32;
const MAX_NAME_LENGTH = 64;
const CODE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
const PERMISSION_CODES = new Set<string>(ALL_PERMISSIONS);

const parseId = (value: string | undefined): number | undefined => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
};

const parsePermissionCodes = (value: unknown): Permission[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const codes: Permission[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !PERMISSION_CODES.has(item)) return undefined;
    if (!codes.includes(item as Permission)) codes.push(item as Permission);
  }
  return codes;
};

const toRoleDetail = (role: Role, permissionCodes: string[], userCount: number) => ({
  id: role.id,
  code: role.code,
  name: role.name,
  permissionCodes,
  userCount,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
});

export const listRolesHandler: Handler = (c) => {
  const permissionsByRole = new Map<number, string[]>();
  for (const { roleId, permissionCode } of listRolePermissions()) {
    const codes = permissionsByRole.get(roleId) ?? [];
    codes.push(permissionCode);
    permissionsByRole.set(roleId, codes);
  }
  const userCounts = new Map(listRoleUserCounts().map(({ roleId, value }) => [roleId, value]));

  return c.json(
    success({
      list: listRoles().map((role) =>
        toRoleDetail(role, permissionsByRole.get(role.id) ?? [], userCounts.get(role.id) ?? 0),
      ),
    }),
  );
};

export const getRoleHandler: Handler = (c) => {
  const roleId = parseId(c.req.param('id'));
  if (!roleId) return c.json(fail('invalidRoleId', ErrorCode.ValidationFailed), 400);
  const role = getRoleById(roleId);
  if (!role) return c.json(fail('roleNotFound', ErrorCode.ResourceNotFound), 404);
  return c.json(
    success({ role: toRoleDetail(role, getRolePermissions(roleId), countRoleUsers(roleId)) }),
  );
};

export const createRoleHandler: Handler = async (c) => {
  let body: { code?: unknown; name?: unknown; permissionCodes?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }

  if (typeof body.code !== 'string') {
    return c.json(fail('invalidRoleCode', ErrorCode.ValidationFailed), 400);
  }
  const code = body.code.trim();
  if (!code || code.length > MAX_CODE_LENGTH || !CODE_PATTERN.test(code)) {
    return c.json(fail('invalidRoleCode', ErrorCode.ValidationFailed), 400);
  }
  if (typeof body.name !== 'string') {
    return c.json(fail('invalidRoleName', ErrorCode.ValidationFailed), 400);
  }
  const name = body.name.trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    return c.json(fail('invalidRoleName', ErrorCode.ValidationFailed), 400);
  }

  let permissionCodes: Permission[] = [];
  if (body.permissionCodes !== undefined) {
    const parsed = parsePermissionCodes(body.permissionCodes);
    if (!parsed) return c.json(fail('invalidPermissionCodes', ErrorCode.ValidationFailed), 400);
    permissionCodes = parsed;
  }

  if (getRoleByCode(code)) {
    return c.json(fail('roleCodeExists', ErrorCode.ResourceConflict), 409);
  }

  const created = db.transaction((tx) => {
    const role = createRole(tx, code, name, new Date());
    if (!role) return undefined;
    setRolePermissions(tx, role.id, permissionCodes);
    return role;
  });
  if (!created) return c.json(fail('roleCodeExists', ErrorCode.ResourceConflict), 409);

  return c.json(success({ role: toRoleDetail(created, permissionCodes, 0) }), 201);
};

export const updateRoleHandler: Handler = async (c) => {
  const roleId = parseId(c.req.param('id'));
  if (!roleId) return c.json(fail('invalidRoleId', ErrorCode.ValidationFailed), 400);
  const role = getRoleById(roleId);
  if (!role) return c.json(fail('roleNotFound', ErrorCode.ResourceNotFound), 404);

  let body: { name?: unknown; permissionCodes?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }

  let name = role.name;
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      return c.json(fail('invalidRoleName', ErrorCode.ValidationFailed), 400);
    }
    name = body.name.trim();
    if (!name || name.length > MAX_NAME_LENGTH) {
      return c.json(fail('invalidRoleName', ErrorCode.ValidationFailed), 400);
    }
  }

  let permissionCodes: Permission[] | undefined;
  if (body.permissionCodes !== undefined) {
    const parsed = parsePermissionCodes(body.permissionCodes);
    if (!parsed) return c.json(fail('invalidPermissionCodes', ErrorCode.ValidationFailed), 400);
    permissionCodes = parsed;
  }

  const updated = db.transaction((tx) => {
    const next = updateRole(tx, roleId, name, new Date());
    if (permissionCodes !== undefined) setRolePermissions(tx, roleId, permissionCodes);
    return next;
  });
  if (!updated) return c.json(fail('roleNotFound', ErrorCode.ResourceNotFound), 404);

  return c.json(
    success({
      role: toRoleDetail(
        updated,
        permissionCodes ?? getRolePermissions(roleId),
        countRoleUsers(roleId),
      ),
    }),
  );
};

export const deleteRoleHandler: Handler = (c) => {
  const roleId = parseId(c.req.param('id'));
  if (!roleId) return c.json(fail('invalidRoleId', ErrorCode.ValidationFailed), 400);
  const role = getRoleById(roleId);
  if (!role) return c.json(fail('roleNotFound', ErrorCode.ResourceNotFound), 404);
  if (role.code === ADMIN_ROLE) {
    return c.json(fail('cannotDeleteAdminRole', ErrorCode.ValidationFailed), 400);
  }
  deleteRole(db, roleId);
  return c.json(success({ id: roleId }));
};
