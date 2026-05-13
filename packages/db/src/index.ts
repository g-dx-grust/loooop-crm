/**
 * ローカル開発: SQLite (file:.local-db/looop.db)
 * 本番デプロイ時: DATABASE_URL を Postgres URL に差し替えて
 *   src/index-pg.ts をこのファイルに置き換えるだけ。
 */
export { getSqliteDb as getDb } from './client-sqlite';
import { getSqliteDb } from './client-sqlite';

export const db = getSqliteDb();

// スキーマ（テーブル定義・型）
export * from './schema-lite';

// drizzle-orm ヘルパーの再エクスポート（callers が drizzle-orm に直接依存しなくて済む）
export { eq, and, or, isNull, isNotNull, inArray, desc, asc, sql, lt, lte, gt, gte, ne } from 'drizzle-orm';
