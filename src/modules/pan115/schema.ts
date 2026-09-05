import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const files115 = sqliteTable('velo_files_115', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pc_code: text('pc_code').unique().notNull(),
  class: text('class'),
  cid: text('cid'),
});
