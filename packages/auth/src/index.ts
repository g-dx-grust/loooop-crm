/**
 * Phase 0 のスタブ認証。
 *
 * 環境変数 STUB_AUTH_ROLE / STUB_AUTH_USER_NAME を読み、固定ユーザを返す。
 * users テーブルに行が無ければ自動的に作成し、role を割り当てる。
 *
 * Phase 1 後半で Lark SSO もしくは Clerk に差し替える前提。
 * 公開 API:
 *   - getCurrentUser(): Promise<SessionUser>
 *   - requireUser(): Promise<SessionUser>
 *   - resetSessionCache(): testing用
 */

import { db, roles, userRoles, users, type RoleCode } from '@looop/db';
import { and, eq } from 'drizzle-orm';

const STUB_EXTERNAL_ID = 'stub:dev-user';

export interface SessionUser {
  id: string;
  externalUserId: string;
  displayName: string;
  email: string;
  roleCodes: RoleCode[];
}

let cached: SessionUser | null = null;

async function ensureRolesSeeded(): Promise<void> {
  const existing = await db.select({ code: roles.code }).from(roles);
  const have = new Set(existing.map((r) => r.code));
  const need: { code: RoleCode; name: string }[] = [
    { code: 'admin', name: '管理者' },
    { code: 'manager', name: 'マネージャー' },
    { code: 'field', name: '現場スタッフ' },
    { code: 'cs', name: 'CS担当' },
    { code: 'finance', name: '経理・管理' },
    { code: 'partner', name: 'パートナー' },
  ];
  const toInsert = need.filter((r) => !have.has(r.code));
  if (toInsert.length > 0) {
    await db.insert(roles).values(toInsert);
  }
}

async function ensureStubUser(): Promise<SessionUser> {
  const role = (process.env.STUB_AUTH_ROLE ?? 'admin') as RoleCode;
  const name = process.env.STUB_AUTH_USER_NAME ?? '開発太郎';

  await ensureRolesSeeded();

  const found = await db.select().from(users).where(eq(users.externalUserId, STUB_EXTERNAL_ID)).limit(1);
  let user = found[0];
  if (!user) {
    const inserted = await db
      .insert(users)
      .values({
        externalUserId: STUB_EXTERNAL_ID,
        displayName: name,
        email: 'dev@example.local',
        status: 'active',
      })
      .returning();
    user = inserted[0];
  }
  if (!user) throw new Error('failed to create stub user');

  // Role 紐付け
  const roleRow = (await db.select().from(roles).where(eq(roles.code, role)).limit(1))[0];
  if (roleRow) {
    const existingLink = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.roleId, roleRow.id)))
      .limit(1);
    if (existingLink.length === 0) {
      await db.insert(userRoles).values({ userId: user.id, roleId: roleRow.id });
    }
  }

  return {
    id: user.id,
    externalUserId: user.externalUserId ?? STUB_EXTERNAL_ID,
    displayName: user.displayName,
    email: user.email,
    roleCodes: [role],
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (cached) return cached;
  try {
    cached = await ensureStubUser();
    return cached;
  } catch (e) {
    console.warn('[auth-stub] failed to ensure stub user (DB not ready?):', (e as Error).message);
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  return u;
}

export function resetSessionCache(): void {
  cached = null;
}
