import type { Handler } from 'hono';

import { decrypt, encrypt } from '../../libs/crypto.js';
import { fail, success } from '../../utils/response.js';
import { getAppVersion } from '../../utils/version.js';
import {
  checkUpdate,
  getCurrentVersion,
  updateToLatest,
} from '../update/service.js';
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

export const getVersionHandler: Handler = async (c) => {
  const web = await getCurrentVersion();
  return c.json(success({ server: getAppVersion(), web: web ?? null }));
};

export const checkUpdateHandler: Handler = async (c) => {
  return c.json(success(await checkUpdate()));
};

export const updateWebHandler: Handler = async (c) => {
  try {
    const version = await updateToLatest();
    return c.json(success({ version }));
  } catch (error) {
    return c.json(
      fail(error instanceof Error ? error.message : 'update failed', 502),
      502,
    );
  }
};

export const deleteConfigHandler: Handler = (c) => {
  const key = c.req.param('key') ?? '';
  if (!isConfigKey(key)) return c.json(fail('invalid config key'), 400);
  deleteConfig(key);
  return c.json(success({ key }));
};
