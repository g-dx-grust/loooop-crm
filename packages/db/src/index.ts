/**
 * Supabase (Postgres) + Drizzle ORM クライアント。
 * DATABASE_URL は apps/web/.env.local (Transaction pooler) を使う。
 *
 * ローカル SQLite に戻したい場合は client-sqlite.ts / schema-lite/ を直接 import すること。
 */
export { getPgDb as getDb } from './client-postgres';
import { getPgDb, type LooopDb } from './client-postgres';

// Keep Next.js/Vercel build-time imports from requiring DATABASE_URL.
export const db: LooopDb = new Proxy({} as LooopDb, {
  get(_target, prop) {
    const actual = getPgDb();
    const value = Reflect.get(actual, prop, actual) as unknown;
    return typeof value === 'function' ? value.bind(actual) : value;
  },
});

// スキーマ（テーブル定義・型）
export * from './schema';

// drizzle-orm ヘルパーの再エクスポート（callers が drizzle-orm に直接依存しなくて済む）
export { eq, and, or, isNull, isNotNull, inArray, desc, asc, sql, lt, lte, gt, gte, ne } from 'drizzle-orm';
