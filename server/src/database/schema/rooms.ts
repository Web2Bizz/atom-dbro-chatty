import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const roomTypeEnum = pgEnum('room_type', ['normal', 'support']);

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull().unique(),
  description: text('description'),
  type: roomTypeEnum('type').default('normal').notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
