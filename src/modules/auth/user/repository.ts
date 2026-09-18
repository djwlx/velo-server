import { and, count, eq } from 'drizzle-orm';

import { db } from '../../../libs/db/index.js';
import { assignRole, createAdminRole } from '../role/repository.js';
import { users } from './schema.js';

export const getActiveUser = (userId: number) =>
  db.select({ id: users.id, email: users.email, nickname: users.nickname }).from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'active'))).get();

export const getUserByEmail = (email: string) =>
  db.select().from(users).where(eq(users.email, email)).get();

export const registerUser = (email: string, nickname: string, passwordHash: string) =>
  db.transaction((tx) => {
    const existingUsers = tx.select({ value: count() }).from(users).get()?.value ?? 0;
    const now = new Date();
    const created = tx.insert(users).values({
      email, nickname, passwordHash, status: 'active', createdAt: now, updatedAt: now,
    }).onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, email: users.email, nickname: users.nickname }).get();

    if (!created) return undefined;

    if (existingUsers === 0) {
      const adminRole = createAdminRole(tx, now);
      if (!adminRole) throw new Error('failed to create admin role');
      assignRole(tx, created.id, adminRole.id);
    }
    return created;
  });
