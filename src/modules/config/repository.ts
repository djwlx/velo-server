import { eq } from 'drizzle-orm';

import { db } from '../../libs/db/index.js';
import { appConfig } from './schema.js';
import type { ConfigKey } from './types.js';

export function getConfig(key: ConfigKey): typeof appConfig.$inferSelect | undefined {
  return db.select().from(appConfig).where(eq(appConfig.key, key)).get();
}

export function setConfig(key: ConfigKey, value: string): void {
  const now = new Date();
  const existing = getConfig(key);
  if (!existing) {
    db.insert(appConfig).values({ key, value, createdAt: now, updatedAt: now }).run();
    return;
  }
  db.update(appConfig).set({ value, updatedAt: now }).where(eq(appConfig.key, key)).run();
}

export function deleteConfig(key: ConfigKey): void {
  db.delete(appConfig).where(eq(appConfig.key, key)).run();
}

export function listConfigs(): Array<typeof appConfig.$inferSelect> {
  return db.select().from(appConfig).all();
}
