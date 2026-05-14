-- Migration: ユーザーテーブルにフリガナ・所属を追加
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kana" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "affiliation" text;
