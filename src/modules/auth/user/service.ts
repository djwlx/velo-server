import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { Handler } from 'hono';

import { ErrorCode } from '../../../config/error-code.js';
import { fail, success } from '../../../utils/response.js';
import { getUserPermissions } from '../permission/repository.js';
import { getUserRoles } from '../role/repository.js';
import { createAccessToken } from '../../../libs/jwt.js';
import type { JwtUser } from '../../../libs/jwt.js';
import { getUserByEmail, registerUser } from './repository.js';

const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 256;
const MIN_PASSWORD_LENGTH = 4;

export type AuthUser = JwtUser;

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

const validateCredentials = (email: string, password: string): string | undefined => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_EMAIL_LENGTH)
    return 'invalid email';
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)
    return 'invalid password';
  return undefined;
};

export const registerHandler: Handler = async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalid request body', ErrorCode.InvalidRequest), 400);
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const validationError = validateCredentials(email, password);
  if (validationError) return c.json(fail(validationError, ErrorCode.ValidationFailed), 400);
  const user = registerUser(email, createDefaultNickname(), hashPassword(password));
  if (!user) return c.json(fail('email already exists', ErrorCode.ResourceConflict), 409);
  return c.json(success({ token: createAccessToken(user), user }), 201);
};

export const loginHandler: Handler = async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json(fail('invalid request body', ErrorCode.InvalidRequest), 400);
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  if (!email || !password || email.length > MAX_EMAIL_LENGTH) {
    return c.json(fail('invalid email or password', ErrorCode.ValidationFailed), 400);
  }
  const user = getUserByEmail(email);
  if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
    return c.json(fail('invalid email or password', ErrorCode.InvalidCredentials), 401);
  }
  const authUser = { id: user.id, email: user.email, nickname: user.nickname };
  return c.json(success({ token: createAccessToken(authUser), user: authUser }));
};

export const meHandler: Handler = (c) => {
  const user = c.get('authUser') as AuthUser | undefined;
  if (!user) return c.json(fail('authentication required', ErrorCode.AuthenticationRequired), 401);
  return c.json(
    success({
      user,
      roles: getUserRoles(user.id),
      permissions: [...getUserPermissions(user.id)],
    }),
  );
};
