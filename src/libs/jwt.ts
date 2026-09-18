import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { ENV } from '../config/env.js';

export type JwtUser = { id: number; email: string; nickname?: string };

const getJwtSecret = (): string => ENV.appSecret;

const encode = (value: string | Buffer): string => Buffer.from(value).toString('base64url');
const decode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');
const sign = (value: string): string =>
  createHmac('sha256', getJwtSecret()).update(value, 'utf8').digest('base64url');

export const createAccessToken = (user: JwtUser): string => {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encode(
    JSON.stringify({
      sub: String(user.id),
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      jti: randomBytes(16).toString('base64url'),
    }),
  );
  const content = `${header}.${payload}`;
  return `${content}.${sign(content)}`;
};

export const verifyAccessToken = (token: string): JwtUser | undefined => {
  if (token.length > 4096) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(decode(encodedHeader)) as { alg?: string; typ?: string };
    const payload = JSON.parse(decode(encodedPayload)) as { sub?: string; email?: string };
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || !payload.sub || !payload.email) {
      return undefined;
    }

    const expected = Buffer.from(sign(`${encodedHeader}.${encodedPayload}`), 'base64url');
    const actual = Buffer.from(encodedSignature, 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;

    const id = Number(payload.sub);
    return Number.isSafeInteger(id) && id > 0 ? { id, email: payload.email } : undefined;
  } catch {
    return undefined;
  }
};
