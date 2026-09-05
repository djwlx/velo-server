import { ConfigKey, sensitiveConfigKeys } from './types.js';

export function isSensitive(key: ConfigKey): boolean {
  return sensitiveConfigKeys.has(key);
}

export function isConfigKey(key: string): key is ConfigKey {
  return Object.values(ConfigKey).includes(key as ConfigKey);
}
