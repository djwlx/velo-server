import type { Handler } from 'hono';

import { decrypt, encrypt } from '../../libs/crypto.js';
import { fail, success } from '../../utils/response.js';
import { deleteConfig, getConfig, setConfig } from './repository.js';
import type { ConfigKey } from './types.js';
import { isConfigKey, isSensitive } from './utils.js';

export function getConfigValue(key: ConfigKey): string | undefined {
  const row = getConfig(key);
  if (!row) return undefined;
  return isSensitive(key) ? decrypt(row.value) : row.value;
}

export const setConfigHandler: Handler = async (c) => {
  const body = await c.req.json<{ key?: string; value?: string }>();
  if (!body.key || !isConfigKey(body.key)) return c.json(fail('invalid config key', 400));
  if (body.value === undefined) return c.json(fail('value is required', 400));
  setConfig(body.key, isSensitive(body.key) ? encrypt(body.value) : body.value);
  return c.json(success({ key: body.key }));
};

export const deleteConfigHandler: Handler = (c) => {
  const key = c.req.param('key') ?? '';
  if (!isConfigKey(key)) return c.json(fail('invalid config key'), 400);
  deleteConfig(key);
  return c.json(success({ key }));
};
