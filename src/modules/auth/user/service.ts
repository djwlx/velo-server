import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { Handler } from 'hono';

import { ErrorCode } from '../../../config/error-code.js';
import { ADMIN_ROLE } from '../../../config/permissions.js';
import type { MessageKey } from '../../../i18n/index.js';
import { db } from '../../../libs/db/index.js';
import { createAccessToken } from '../../../libs/jwt.js';
import { fail, success } from '../../../utils/response.js';
import { getUserPermissions } from '../permission/repository.js';
import {
  getRoleByCode,
  getRolesByIds,
  getUserRoleIds,
  getUserRoles,
  isLastActiveAdmin,
  setUserRoles,
} from '../role/repository.js';
import {
  createUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  getUserPublicById,
  listUsers,
  registerUser,
  updateUser,
} from './repository.js';

const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 256;
const MIN_PASSWORD_LENGTH = 4;
const MAX_NICKNAME_LENGTH = 32;
const MAX_AVATAR_LENGTH = 2048;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const USER_STATUSES = ['active', 'disabled'] as const;
type UserStatus = (typeof USER_STATUSES)[number];

export type AuthUser = { id: number; email: string; nickname: string; avatar: string };

const isUserStatus = (value: unknown): value is UserStatus =>
  typeof value === 'string' && (USER_STATUSES as readonly string[]).includes(value);

const createDefaultNickname = (): string => `用户_${randomBytes(4).toString('hex')}`;

const hashPassword = (password: string): string => {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('base64')}:${scryptSync(password, salt, 64).toString('base64')}`;
};

const verifyPassword = (password: string, encoded: string): boolean => {
  const [algorithm, saltText, hashText] = encoded.split(':');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, 'base64');
    const actual = scryptSync(password, Buffer.from(saltText, 'base64'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

const validateCredentials = (email: string, password: string): MessageKey | undefined => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_EMAIL_LENGTH)
    return 'invalidEmail';
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)
    return 'invalidPassword';
  return undefined;
};

const parseId = (value: string | undefined): number | undefined => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
};

const parsePageParam = (value: string | undefined, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const parseRoleIds = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const roleIds: number[] = [];
  for (const item of value) {
    if (!Number.isSafeInteger(item) || (item as number) <= 0) return undefined;
    if (!roleIds.includes(item as number)) roleIds.push(item as number);
  }
  return roleIds;
};

const rolesExist = (roleIds: number[]): boolean =>
  roleIds.length === 0 || getRolesByIds(roleIds).length === roleIds.length;

const toUserDetail = (userId: number, user: object, roleIds?: number[]) => ({
  ...user,
  roleIds: roleIds ?? getUserRoleIds(userId),
  roles: getUserRoles(userId),
});

export const registerHandler: Handler = async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const validationError = validateCredentials(email, password);
  if (validationError) return c.json(fail(validationError, ErrorCode.ValidationFailed), 400);
  const user = registerUser(email, createDefaultNickname(), hashPassword(password));
  if (!user) return c.json(fail('emailAlreadyExists', ErrorCode.ResourceConflict), 409);
  return c.json(success({ token: createAccessToken(user), user }), 201);
};

export const loginHandler: Handler = async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  if (!email || !password || email.length > MAX_EMAIL_LENGTH) {
    return c.json(fail('invalidEmailOrPassword', ErrorCode.ValidationFailed), 400);
  }
  const user = getUserByEmail(email);
  if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
    return c.json(fail('invalidEmailOrPassword', ErrorCode.InvalidCredentials), 401);
  }
  const authUser = {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
  };
  return c.json(success({ token: createAccessToken(authUser), user: authUser }));
};

export const meHandler: Handler = (c) => {
  const user = c.get('authUser') as AuthUser | undefined;
  if (!user) return c.json(fail('authenticationRequired', ErrorCode.AuthenticationRequired), 401);
  return c.json(
    success({
      user,
      roles: getUserRoles(user.id),
      permissions: [...getUserPermissions(user.id)],
    }),
  );
};

export const updateMeHandler: Handler = async (c) => {
  const user = c.get('authUser') as AuthUser | undefined;
  if (!user) return c.json(fail('authenticationRequired', ErrorCode.AuthenticationRequired), 401);

  let body: {
    nickname?: unknown;
    avatar?: unknown;
    password?: unknown;
    currentPassword?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }

  const updates: { nickname?: string; avatar?: string; passwordHash?: string } = {};

  if (body.nickname !== undefined) {
    if (typeof body.nickname !== 'string') {
      return c.json(fail('invalidNickname', ErrorCode.ValidationFailed), 400);
    }
    const nickname = body.nickname.trim();
    if (!nickname || nickname.length > MAX_NICKNAME_LENGTH) {
      return c.json(fail('invalidNickname', ErrorCode.ValidationFailed), 400);
    }
    updates.nickname = nickname;
  }

  if (body.avatar !== undefined) {
    if (typeof body.avatar !== 'string') {
      return c.json(fail('invalidAvatar', ErrorCode.ValidationFailed), 400);
    }
    const avatar = body.avatar.trim();
    if (avatar.length > MAX_AVATAR_LENGTH) {
      return c.json(fail('invalidAvatar', ErrorCode.ValidationFailed), 400);
    }
    updates.avatar = avatar;
  }

  if (body.password !== undefined) {
    if (
      typeof body.password !== 'string' ||
      body.password.length < MIN_PASSWORD_LENGTH ||
      body.password.length > MAX_PASSWORD_LENGTH
    ) {
      return c.json(fail('invalidPassword', ErrorCode.ValidationFailed), 400);
    }
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const record = getUserById(user.id);
    if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
      return c.json(fail('invalidCurrentPassword', ErrorCode.InvalidCredentials), 401);
    }
    updates.passwordHash = hashPassword(body.password);
  }

  if (Object.keys(updates).length === 0) {
    return c.json(fail('noFieldsToUpdate', ErrorCode.ValidationFailed), 400);
  }

  return c.json(success({ user: updateUser(db, user.id, updates) }));
};

export const listUsersHandler: Handler = (c) => {
  const page = parsePageParam(c.req.query('page'), 1, Number.MAX_SAFE_INTEGER);
  const pageSize = parsePageParam(c.req.query('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const keyword = c.req.query('keyword')?.trim() || undefined;
  const { rows, total } = listUsers({ offset: (page - 1) * pageSize, limit: pageSize, keyword });
  return c.json(success({ list: rows, total, page, pageSize }));
};

export const getUserHandler: Handler = (c) => {
  const userId = parseId(c.req.param('id'));
  if (!userId) return c.json(fail('invalidUserId', ErrorCode.ValidationFailed), 400);
  const user = getUserPublicById(userId);
  if (!user) return c.json(fail('userNotFound', ErrorCode.ResourceNotFound), 404);
  return c.json(success({ user: toUserDetail(userId, user) }));
};

export const createUserHandler: Handler = async (c) => {
  let body: {
    email?: unknown;
    password?: unknown;
    nickname?: unknown;
    avatar?: unknown;
    status?: unknown;
    roleIds?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return c.json(fail('invalidEmailOrPassword', ErrorCode.ValidationFailed), 400);
  }
  const email = body.email.trim().toLowerCase();
  const validationError = validateCredentials(email, body.password);
  if (validationError) return c.json(fail(validationError, ErrorCode.ValidationFailed), 400);

  let nickname = createDefaultNickname();
  if (body.nickname !== undefined) {
    if (typeof body.nickname !== 'string') {
      return c.json(fail('invalidNickname', ErrorCode.ValidationFailed), 400);
    }
    nickname = body.nickname.trim();
    if (!nickname || nickname.length > MAX_NICKNAME_LENGTH) {
      return c.json(fail('invalidNickname', ErrorCode.ValidationFailed), 400);
    }
  }

  let avatar = '';
  if (body.avatar !== undefined) {
    if (typeof body.avatar !== 'string') {
      return c.json(fail('invalidAvatar', ErrorCode.ValidationFailed), 400);
    }
    avatar = body.avatar.trim();
    if (avatar.length > MAX_AVATAR_LENGTH) {
      return c.json(fail('invalidAvatar', ErrorCode.ValidationFailed), 400);
    }
  }

  let status: UserStatus = 'active';
  if (body.status !== undefined) {
    if (!isUserStatus(body.status)) {
      return c.json(fail('invalidStatus', ErrorCode.ValidationFailed), 400);
    }
    status = body.status;
  }

  let roleIds: number[] = [];
  if (body.roleIds !== undefined) {
    const parsed = parseRoleIds(body.roleIds);
    if (!parsed) return c.json(fail('invalidRoleIds', ErrorCode.ValidationFailed), 400);
    if (!rolesExist(parsed)) return c.json(fail('roleNotFound', ErrorCode.ResourceNotFound), 404);
    roleIds = parsed;
  }

  const passwordHash = hashPassword(body.password);
  const created = db.transaction((tx) => {
    const user = createUser(tx, { email, nickname, avatar, passwordHash, status });
    if (!user) return undefined;
    if (roleIds.length) setUserRoles(tx, user.id, roleIds);
    return user;
  });
  if (!created) return c.json(fail('emailAlreadyExists', ErrorCode.ResourceConflict), 409);

  return c.json(success({ user: toUserDetail(created.id, created, roleIds) }), 201);
};

export const updateUserHandler: Handler = async (c) => {
  const userId = parseId(c.req.param('id'));
  if (!userId) return c.json(fail('invalidUserId', ErrorCode.ValidationFailed), 400);
  const existing = getUserPublicById(userId);
  if (!existing) return c.json(fail('userNotFound', ErrorCode.ResourceNotFound), 404);

  let body: {
    nickname?: unknown;
    avatar?: unknown;
    password?: unknown;
    status?: unknown;
    roleIds?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalidRequest', ErrorCode.InvalidRequest), 400);
  }

  const updates: Partial<{
    nickname: string;
    avatar: string;
    passwordHash: string;
    status: string;
  }> = {};

  if (body.nickname !== undefined) {
    if (typeof body.nickname !== 'string') {
      return c.json(fail('invalidNickname', ErrorCode.ValidationFailed), 400);
    }
    const nickname = body.nickname.trim();
    if (!nickname || nickname.length > MAX_NICKNAME_LENGTH) {
      return c.json(fail('invalidNickname', ErrorCode.ValidationFailed), 400);
    }
    updates.nickname = nickname;
  }

  if (body.avatar !== undefined) {
    if (typeof body.avatar !== 'string') {
      return c.json(fail('invalidAvatar', ErrorCode.ValidationFailed), 400);
    }
    const avatar = body.avatar.trim();
    if (avatar.length > MAX_AVATAR_LENGTH) {
      return c.json(fail('invalidAvatar', ErrorCode.ValidationFailed), 400);
    }
    updates.avatar = avatar;
  }

  if (body.password !== undefined) {
    if (
      typeof body.password !== 'string' ||
      body.password.length < MIN_PASSWORD_LENGTH ||
      body.password.length > MAX_PASSWORD_LENGTH
    ) {
      return c.json(fail('invalidPassword', ErrorCode.ValidationFailed), 400);
    }
    updates.passwordHash = hashPassword(body.password);
  }

  if (body.status !== undefined) {
    if (!isUserStatus(body.status)) {
      return c.json(fail('invalidStatus', ErrorCode.ValidationFailed), 400);
    }
    updates.status = body.status;
  }

  let roleIds: number[] | undefined;
  if (body.roleIds !== undefined) {
    const parsed = parseRoleIds(body.roleIds);
    if (!parsed) return c.json(fail('invalidRoleIds', ErrorCode.ValidationFailed), 400);
    if (!rolesExist(parsed)) return c.json(fail('roleNotFound', ErrorCode.ResourceNotFound), 404);
    roleIds = parsed;
  }

  if (Object.keys(updates).length === 0 && roleIds === undefined) {
    return c.json(fail('noFieldsToUpdate', ErrorCode.ValidationFailed), 400);
  }

  const disabling = updates.status === 'disabled' && existing.status !== 'disabled';
  const adminRole = getRoleByCode(ADMIN_ROLE);
  const removesAdminRole = roleIds !== undefined && (!adminRole || !roleIds.includes(adminRole.id));
  if ((disabling || removesAdminRole) && isLastActiveAdmin(userId)) {
    return c.json(fail('lastActiveAdmin', ErrorCode.ValidationFailed), 400);
  }

  const updated = db.transaction((tx) => {
    const next = Object.keys(updates).length ? updateUser(tx, userId, updates) : existing;
    if (roleIds !== undefined) setUserRoles(tx, userId, roleIds);
    return next;
  });
  if (!updated) return c.json(fail('userNotFound', ErrorCode.ResourceNotFound), 404);

  return c.json(success({ user: toUserDetail(userId, updated, roleIds) }));
};

export const deleteUserHandler: Handler = (c) => {
  const userId = parseId(c.req.param('id'));
  if (!userId) return c.json(fail('invalidUserId', ErrorCode.ValidationFailed), 400);
  const current = c.get('authUser') as AuthUser | undefined;
  if (current?.id === userId) {
    return c.json(fail('cannotDeleteYourself', ErrorCode.ValidationFailed), 400);
  }
  const existing = getUserPublicById(userId);
  if (!existing) return c.json(fail('userNotFound', ErrorCode.ResourceNotFound), 404);
  if (isLastActiveAdmin(userId)) {
    return c.json(fail('lastActiveAdmin', ErrorCode.ValidationFailed), 400);
  }
  deleteUser(db, userId);
  return c.json(success({ id: userId }));
};
