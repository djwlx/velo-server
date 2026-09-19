import { and, count, desc, eq, like, or } from 'drizzle-orm';

import { db } from '../../../libs/db/index.js';
import { assignRole, createAdminRole } from '../role/repository.js';
import { users } from './schema.js';

type DbClient = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

const userFields = {
  id: users.id,
  email: users.email,
  nickname: users.nickname,
  avatar: users.avatar,
  status: users.status,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const getActiveUser = (userId: number) =>
  db
    .select({ id: users.id, email: users.email, nickname: users.nickname, avatar: users.avatar })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'active')))
    .get();

export const getUserById = (userId: number) =>
  db.select().from(users).where(eq(users.id, userId)).get();

export const getUserPublicById = (userId: number) =>
  db.select(userFields).from(users).where(eq(users.id, userId)).get();

export const getUserByEmail = (email: string) =>
  db.select().from(users).where(eq(users.email, email)).get();

export const listUsers = (options: { offset: number; limit: number; keyword?: string }) => {
  const filter = options.keyword
    ? or(like(users.email, `%${options.keyword}%`), like(users.nickname, `%${options.keyword}%`))
    : undefined;
  const rows = db
    .select(userFields)
    .from(users)
    .where(filter)
    .orderBy(desc(users.id))
    .limit(options.limit)
    .offset(options.offset)
    .all();
  const total = db.select({ value: count() }).from(users).where(filter).get()?.value ?? 0;
  return { rows, total };
};

export const createUser = (
  client: DbClient,
  values: {
    email: string;
    nickname: string;
    avatar: string;
    passwordHash: string;
    status: string;
  },
) => {
  const now = new Date();
  return client
    .insert(users)
    .values({ ...values, createdAt: now, updatedAt: now })
    .onConflictDoNothing({ target: users.email })
    .returning(userFields)
    .get();
};

export const updateUser = (
  client: DbClient,
  userId: number,
  values: Partial<{ nickname: string; avatar: string; passwordHash: string; status: string }>,
) =>
  client
    .update(users)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning(userFields)
    .get();

export const deleteUser = (client: DbClient, userId: number): number =>
  client.delete(users).where(eq(users.id, userId)).run().changes;

export const registerUser = (email: string, nickname: string, passwordHash: string) =>
  db.transaction((tx) => {
    const existingUsers = tx.select({ value: count() }).from(users).get()?.value ?? 0;
    const now = new Date();
    const created = tx
      .insert(users)
      .values({
        email,
        nickname,
        passwordHash,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: users.email })
      .returning(userFields)
      .get();

    if (!created) return undefined;

    if (existingUsers === 0) {
      const adminRole = createAdminRole(tx, now);
      if (!adminRole) throw new Error('failed to create admin role');
      assignRole(tx, created.id, adminRole.id);
    }
    return created;
  });
