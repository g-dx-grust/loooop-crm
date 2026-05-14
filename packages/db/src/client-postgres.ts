import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type LooopDb = PostgresJsDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __looop_pg: LooopDb | undefined;
  // eslint-disable-next-line no-var
  var __looop_pg_client: ReturnType<typeof postgres> | undefined;
}

export function getPgDb(): LooopDb {
  if (!global.__looop_pg) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const client = postgres(url, {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    global.__looop_pg_client = client;
    global.__looop_pg = drizzle(client, { schema });
  }
  return global.__looop_pg;
}
