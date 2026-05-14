'use server';

import { db, events, auditLogs, consentTextVersions, users, userRoles, roles, eq } from '@looop/db';
import type { RoleCode } from '@looop/db';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@looop/auth';
import { requirePermission } from '@looop/permissions';

export interface CreateEventInput {
  eventName: string;
  venueName?: string;
  venueAddress?: string;
  eventDate?: string;
  area?: string;
  staffId?: string;
  status?: string;
  cost?: number;
  memo?: string;
}

export interface CreateConsentVersionInput {
  version: string;
  body: string;
}

const EVENT_STATUSES = new Set(['scheduled', 'active', 'closed', 'disabled']);

function normalizeEventInput(input: CreateEventInput) {
  return {
    eventName: input.eventName.trim(),
    venueName: input.venueName?.trim() || null,
    venueAddress: input.venueAddress?.trim() || null,
    eventDate: input.eventDate || null,
    area: input.area?.trim() || null,
    staffId: input.staffId || null,
    status: input.status && EVENT_STATUSES.has(input.status) ? input.status : 'active',
    cost: input.cost !== undefined && Number.isFinite(input.cost) ? input.cost : null,
    memo: input.memo?.trim() || null,
  };
}

export async function createEvent(
  input: CreateEventInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('event.manage');
    const normalized = normalizeEventInput(input);
    if (!normalized.eventName) {
      return { success: false, error: '催事名は必須です' };
    }

    const now = new Date();
    await db.insert(events).values({
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(auditLogs).values({
      action: 'create_event',
      resourceType: 'event',
      diff: { input: normalized },
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('createEvent error:', err);
    return { success: false, error: '会場の作成に失敗しました' };
  }
}

export async function updateEvent(
  id: string,
  input: CreateEventInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('event.manage');
    const normalized = normalizeEventInput(input);
    if (!normalized.eventName) {
      return { success: false, error: '催事名は必須です' };
    }

    const now = new Date();
    await db
      .update(events)
      .set({
        ...normalized,
        updatedAt: now,
      })
      .where(eq(events.id, id));

    await db.insert(auditLogs).values({
      action: 'update_event',
      resourceType: 'event',
      resourceId: id,
      diff: { input: normalized },
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('updateEvent error:', err);
    return { success: false, error: '会場の更新に失敗しました' };
  }
}

export async function createConsentVersion(
  input: CreateConsentVersionInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const version = input.version.trim();
    const body = input.body.trim();
    if (!version) return { success: false, error: 'バージョンを入力してください' };
    if (!body) return { success: false, error: '同意文を入力してください' };

    const now = new Date();
    await db.insert(consentTextVersions).values({
      version,
      consentType: 'combined_personal_solar',
      body,
      effectiveFrom: now,
      createdAt: now,
    });

    await db.insert(auditLogs).values({
      action: 'create_consent_text_version',
      resourceType: 'consent_text_version',
      diff: { version, consentType: 'combined_personal_solar' },
      createdAt: now,
    });

    revalidatePath('/admin');
    revalidatePath('/intake');
    return { success: true };
  } catch (err) {
    console.error('createConsentVersion error:', err);
    return { success: false, error: '同意文バージョンの作成に失敗しました' };
  }
}

// ---------------------------------------------------------------------------
// User & role management
// ---------------------------------------------------------------------------

const ROLE_CODES_SET = new Set<RoleCode>(['admin', 'manager', 'field', 'cs', 'finance', 'partner']);

export interface CreateUserInput {
  displayName: string;
  kana?: string;
  email: string;
  password: string;
  roleCode: RoleCode;
  affiliation?: string;
  userStatus?: 'active' | 'suspended';
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getRoleIdByCode(code: RoleCode): Promise<string | null> {
  const rows = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, code)).limit(1);
  return rows[0]?.id ?? null;
}

export async function createPasswordUser(
  input: CreateUserInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('admin.manage_users');

    const displayName = input.displayName.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    if (!displayName) return { success: false, error: '表示名を入力してください' };
    if (!validateEmail(email)) return { success: false, error: '正しいメールアドレスを入力してください' };
    if (password.length < 8) return { success: false, error: 'パスワードは 8 文字以上で入力してください' };
    if (!ROLE_CODES_SET.has(input.roleCode)) return { success: false, error: '権限の指定が不正です' };

    // 既存チェック
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return { success: false, error: 'このメールアドレスは既に登録されています' };
    }

    const roleId = await getRoleIdByCode(input.roleCode);
    if (!roleId) return { success: false, error: '権限マスタが見つかりません' };

    const passwordHash = hashPassword(password);
    const now = new Date();
    const status = input.userStatus === 'suspended' ? 'suspended' : 'active';

    const inserted = await db
      .insert(users)
      .values({
        displayName,
        kana: input.kana?.trim() || null,
        email,
        affiliation: input.affiliation?.trim() || null,
        status,
        authProvider: 'password',
        passwordHash,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: users.id });
    const newId = inserted[0]?.id;
    if (!newId) return { success: false, error: 'ユーザー作成に失敗しました' };

    await db.insert(userRoles).values({ userId: newId, roleId, createdAt: now });

    await db.insert(auditLogs).values({
      action: 'create_user',
      resourceType: 'user',
      resourceId: newId,
      diff: { displayName, email, roleCode: input.roleCode, authProvider: 'password' },
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('createPasswordUser error:', err);
    return { success: false, error: 'ユーザー作成に失敗しました' };
  }
}

export async function updateUserRole(
  userId: string,
  roleCode: RoleCode,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('admin.manage_users');
    if (!ROLE_CODES_SET.has(roleCode)) return { success: false, error: '権限の指定が不正です' };
    const newRoleId = await getRoleIdByCode(roleCode);
    if (!newRoleId) return { success: false, error: '権限マスタが見つかりません' };

    const now = new Date();
    // 既存の権限を削除して 1 つだけ付与（複数権限は将来対応）
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    await db.insert(userRoles).values({ userId, roleId: newRoleId, createdAt: now });

    await db.insert(auditLogs).values({
      action: 'update_user_role',
      resourceType: 'user',
      resourceId: userId,
      diff: { roleCode },
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('updateUserRole error:', err);
    return { success: false, error: '権限の更新に失敗しました' };
  }
}

export async function setUserStatus(
  userId: string,
  status: 'active' | 'suspended',
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('admin.manage_users');
    const now = new Date();
    await db.update(users).set({ status, updatedAt: now }).where(eq(users.id, userId));
    await db.insert(auditLogs).values({
      action: status === 'active' ? 'reactivate_user' : 'suspend_user',
      resourceType: 'user',
      resourceId: userId,
      diff: { status },
      createdAt: now,
    });
    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('setUserStatus error:', err);
    return { success: false, error: 'ステータスの更新に失敗しました' };
  }
}

export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('admin.manage_users');
    if (newPassword.length < 8) return { success: false, error: 'パスワードは 8 文字以上で入力してください' };

    const target = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = target[0];
    if (!u) return { success: false, error: '対象ユーザーが見つかりません' };
    if (u.authProvider !== 'password') {
      return { success: false, error: 'Lark ユーザーのパスワードは変更できません' };
    }

    const now = new Date();
    await db
      .update(users)
      .set({ passwordHash: hashPassword(newPassword), updatedAt: now })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      action: 'reset_user_password',
      resourceType: 'user',
      resourceId: userId,
      createdAt: now,
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (err) {
    console.error('resetUserPassword error:', err);
    return { success: false, error: 'パスワード再設定に失敗しました' };
  }
}

