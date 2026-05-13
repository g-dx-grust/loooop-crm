import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import * as schema from './schema-lite';

export type LooopDb = BetterSQLite3Database<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __looop_sqlite: LooopDb | undefined;
}

export function getSqliteDb(): LooopDb {
  if (!global.__looop_sqlite) {
    const url = process.env.DATABASE_URL ?? 'file:.local-db/looop.db';
    const rel = url.replace(/^file:/, '');
    const dbPath = resolve(process.cwd(), rel);
    mkdirSync(dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    global.__looop_sqlite = drizzle(sqlite, { schema });
  }
  return global.__looop_sqlite;
}
