import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database(path.resolve(process.cwd(), 'data/index.db'));
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);
