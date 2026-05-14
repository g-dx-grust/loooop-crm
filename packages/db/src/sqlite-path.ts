/**
 * Resolve the local SQLite database file to a stable, monorepo-root-relative
 * location so every process (seed script, Next.js server, drizzle studio)
 * touches the same file regardless of the cwd it was launched from.
 *
 * If DATABASE_URL is an absolute path (file:/abs/path) it's used as-is.
 * Otherwise the path is resolved against the monorepo root, identified by
 * walking up from cwd until pnpm-workspace.yaml is found.
 */
import { existsSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';

function findMonorepoRoot(start: string): string {
  let dir = start;
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = dirname(dir);
  }
  return start;
}

export function resolveSqlitePath(): string {
  const url = process.env.DATABASE_URL ?? 'file:.local-db/looop.db';
  const rel = url.replace(/^file:/, '');
  if (isAbsolute(rel)) return rel;
  const root = findMonorepoRoot(process.cwd());
  return resolve(root, rel);
}
