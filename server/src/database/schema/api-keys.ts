import { pgTable, uuid, text, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(), // JWT токен
  name: varchar('name', { length: 255 }),
  userId: uuid('user_id'),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  // Дополнительные поля для безопасности
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  scopes: text('scopes'), // JSON массив разрешений
  // permissions: text('permissions'), // Убрано - поле не существует в таблице БД
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
