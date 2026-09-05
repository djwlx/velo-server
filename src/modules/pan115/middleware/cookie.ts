import type { MiddlewareHandler } from 'hono';

import { fail } from '../../../utils/response.js';
import { getConfigValue } from '../../config/service.js';
import { ConfigKey } from '../../config/types.js';
import type { Pan115Env } from '../types.js';

export const injectCookie: MiddlewareHandler<Pan115Env> = async (c, next) => {
  const cookie = getConfigValue(ConfigKey.cookie115);
  if (!cookie) return c.json(fail('cookie115 not configured'));
  c.set('cookie115', cookie);
  await next();
};
