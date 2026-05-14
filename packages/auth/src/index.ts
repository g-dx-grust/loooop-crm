/**
 * Cookie ベースのセッション認証。
 *
 * - Lark SSO（社内スタッフ） : externalUserId が 'lark:*' のユーザー。Phase 0 はモック。
 * - メール + パスワード（外部スタッフ・パートナー） : scrypt ハッシュ照合。
 *
 * セッショントークンは HMAC-SHA256 で署名し、HttpOnly Cookie に格納する。
 *
 * 公開 API:
 *   - getCurrentUser()           : 現セッションのユーザー（未ログインなら null）
 *   - requireUser()              : 未ログイン時は throw
 *   - loginWithPassword()        : Server Action から呼ぶ
 *   - loginWithLark()            : Server Action から呼ぶ（Phase 0 モック）
 *   - logout()                   : Cookie 削除
 *   - hashPassword() / verifyPasswordHash() : 管理画面のユーザー作成用
 */

import { cookies } from 'next/headers';
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, eq, roles, userRoles, users, type RoleCode } from '@looop/db';

const COOKIE_NAME = 'looop_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 日
const SECRET = process.env.AUTH_SECRET ?? 'looop-crm-dev-secret-please-rotate-in-production';

export interface SessionUser {
  id: string;
  externalUserId: string | null;
  displayName: string;
  email: string;
  roleCodes: RoleCode[];
  authProvider: 'lark' | 'password';
}

// ---------------------------------------------------------------------------
// パスワードハッシュ
// ---------------------------------------------------------------------------
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(plain: string, stored: string): boolean {
  const segs = stored.split(':');
  const salt = segs[0];
  const hashHex = segs[1];
  if (!salt || !hashHex) return false;
  let expected: Buffer;
  let test: Buffer;
  try {
    expected = Buffer.from(hashHex, 'hex');
    test = scryptSync(plain, salt, 64);
  } catch {
    return false;
  }
  if (expected.length !== test.length) return false;
  return timingSafeEqual(expected, test);
}

// ---------------------------------------------------------------------------
// セッショントークン (userId|expiresAt を HMAC で署名)
// ---------------------------------------------------------------------------
function signToken(userId: string, expiresAt: number): string {
  const payload = `${userId}|${expiresAt}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): { userId: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const encoded = parts[0];
  const sig = parts[1];
  if (!encoded || !sig) return null;
  const expectedSig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  if (sig !== expectedSig) return null;
  const payload = Buffer.from(encoded, 'base64url').toString();
  const segs = payload.split('|');
  const userId = segs[0];
  const expStr = segs[1];
  if (!userId || !expStr) return null;
  const expiresAt = Number(expStr);
  if (Number.isNaN(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;
  return { userId, expiresAt };
}

async function setSessionCookie(userId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = signToken(userId, expiresAt);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
  });
}

// ---------------------------------------------------------------------------
// ユーザー読み込み
// ---------------------------------------------------------------------------
async function loadUser(userId: string): Promise<SessionUser | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const u = rows[0];
  if (!u || u.deletedAt || u.status !== 'active') return null;

  const linked = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, u.id));

  return {
    id: u.id,
    externalUserId: u.externalUserId ?? null,
    displayName: u.displayName,
    email: u.email,
    roleCodes: linked.map((r) => r.code as RoleCode),
    authProvider: (u.authProvider === 'lark' ? 'lark' : 'password'),
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const verified = verifyToken(token);
    if (!verified) return null;
    return await loadUser(verified.userId);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  return u;
}

export function resetSessionCache(): void {
  // 旧スタブ実装の後方互換用 no-op
}

// ---------------------------------------------------------------------------
// ログイン: メール + パスワード
// ---------------------------------------------------------------------------
export type LoginResult = { success: true } | { success: false; error: string };

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const normEmail = email.trim().toLowerCase();
  if (!normEmail || !password) {
    return { success: false, error: 'メールアドレスとパスワードを入力してください' };
  }

  const rows = await db.select().from(users).where(eq(users.email, normEmail)).limit(1);
  const u = rows[0];
  if (!u || u.deletedAt || u.status !== 'active') {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }
  if (!u.passwordHash) {
    return { success: false, error: 'このアカウントはパスワードログインに対応していません。Lark でログインしてください。' };
  }
  if (!verifyPasswordHash(password, u.passwordHash)) {
    return { success: false, error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  await setSessionCookie(u.id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// ログイン: Lark SSO（Phase 0 モック）
//
// 本実装では Lark の OAuth フローへリダイレクトする (/api/auth/lark)。
// LARK_APP_ID 未設定時は STUB_LARK_EMAIL で指定したユーザーでログインするモック。
// ---------------------------------------------------------------------------
export async function loginWithLark(): Promise<LoginResult> {
  const stubEmail = process.env.STUB_LARK_EMAIL ?? 'kawaguchi@n-grust.co.jp';
  const rows = await db.select().from(users).where(eq(users.email, stubEmail)).limit(1);
  const u = rows[0];
  if (!u || u.deletedAt || u.status !== 'active') {
    return { success: false, error: 'Lark ユーザーが見つかりませんでした。管理者へお問い合わせください。' };
  }
  await setSessionCookie(u.id);
  return { success: true };
}

// OAuth コールバックから呼ぶ: メール照合後にセッションを発行する
export async function createSessionForUser(userId: string): Promise<void> {
  await setSessionCookie(userId);
}

// ---------------------------------------------------------------------------
// ログアウト
// ---------------------------------------------------------------------------
export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
