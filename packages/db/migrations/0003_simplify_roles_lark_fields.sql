-- Migration 0003: Simplify roles to admin/field only + add Lark SSO columns
-- ---------------------------------------------------------------------------

-- 1. Lark SSO 紐付け用カラムを追加
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lark_user_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lark_email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lark_name" text;

-- 2. 既存の manager → admin に移行
UPDATE "user_roles"
SET "role_id" = (SELECT id FROM "roles" WHERE code = 'admin')
WHERE "role_id" IN (SELECT id FROM "roles" WHERE code = 'manager');

-- 3. 既存の cs / finance / partner → field に移行
UPDATE "user_roles"
SET "role_id" = (SELECT id FROM "roles" WHERE code = 'field')
WHERE "role_id" IN (SELECT id FROM "roles" WHERE code IN ('cs', 'finance', 'partner'));

-- 4. 不要なロールを削除（user_roles 側は上記で移行済み）
DELETE FROM "roles" WHERE code IN ('manager', 'cs', 'finance', 'partner');
