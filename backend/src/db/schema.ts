import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(cast(unixepoch() as integer))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(unixepoch() as integer))`),
});

export const userCredentials = sqliteTable('user_credentials', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imapHost: text('imap_host').notNull(),
  imapPort: integer('imap_port').notNull().default(993),
  imapSecure: integer('imap_secure').notNull().default(1),
  imapUser: text('imap_user').notNull(),
  imapPass: text('imap_pass').notNull(),
  smtpHost: text('smtp_host').notNull(),
  smtpPort: integer('smtp_port').notNull().default(587),
  smtpSecure: integer('smtp_secure').notNull().default(0),
  smtpUser: text('smtp_user').notNull(),
  smtpPass: text('smtp_pass').notNull(),
  fromEmail: text('from_email').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(cast(unixepoch() as integer))`),
  updatedAt: integer('updated_at').notNull().default(sql`(cast(unixepoch() as integer))`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(cast(unixepoch() as integer))`),
});

export type User = typeof users.$inferSelect;
export type UserCredential = typeof userCredentials.$inferSelect;
export type Session = typeof sessions.$inferSelect;
