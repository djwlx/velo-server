import { count } from 'drizzle-orm';

import { db } from '../../../libs/db/index.js';
import { files115 } from '../schema.js';

export function getPicCount(): number {
  const row = db.select({ value: count() }).from(files115).get();
  return row?.value ?? 0;
}

export function getPicByIndex(index: number): typeof files115.$inferSelect | undefined {
  return db.select().from(files115).limit(1).offset(index).get();
}

export function bulkInsertPics(pics: Array<typeof files115.$inferInsert>): number {
  if (!pics.length) return 0;
  const result = db.insert(files115).values(pics).onConflictDoNothing().run();
  return result.changes;
}

export function clearAllPics(): number {
  return db.delete(files115).run().changes;
}
