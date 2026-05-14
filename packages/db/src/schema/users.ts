import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Clerk / Lark / 自前認証 などを抽象化（auth provider 後決め）
  externalUserId: text('external_user_id').unique(),
  displayName: text('display_name').notNull(),
  kana: text('kana'),
  email: text('email').notNull(),
  phone: text('phone'),
  affiliation: text('affiliation'),
  teamId: uuid('team_id'),
  status: text('status').notNull().default('active'),
  authProvider: text('auth_provider').notNull().default('password'),
  passwordHash: text('password_hash'),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  leftAt: timestamp('left_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  index('users_status_idx').on(t.status),
]);

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
  scope: jsonb('scope').$type<{ teamId?: string }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] }),
  index('user_roles_role_idx').on(t.roleId),
]);

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  managerId: uuid('manager_id'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 仮の名前変換ヘルパ（外で参照しやすく）
export type UserRow = typeof users.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
