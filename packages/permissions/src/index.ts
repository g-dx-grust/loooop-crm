/**
 * RBAC ヘルパ。
 * role -> permission のマップを定義し、現在のユーザの role から判定する。
 * docs/03_auth_rbac.md と一致させる。
 */

import { requireUser, type SessionUser } from '@looop/auth';
import type { RoleCode } from '@looop/db';

export type Permission =
  | 'customer.read.own'
  | 'customer.read.team'
  | 'customer.read.all'
  | 'customer.write.own'
  | 'customer.write.team'
  | 'customer.write.all'
  | 'customer.delete'
  | 'csv.export'
  | 'admin.manage_users'
  | 'event.manage'
  | 'kpi.view.team'
  | 'kpi.view.all'
  | 'consent.grant'
  | 'consent.withdraw'
  | 'partner.handoff'
  // ナビゲーション用 (サイドバーの表示制御)
  | 'nav.intake'
  | 'nav.customers'
  | 'nav.looop'
  | 'nav.bills'
  | 'nav.refunds'
  | 'nav.cross_sell'
  | 'nav.solar_handoff'
  | 'nav.sales'
  | 'nav.kpi'
  | 'nav.fee_master'
  | 'nav.admin';

const ALL_PERMS: Permission[] = [
  'customer.read.own',
  'customer.read.team',
  'customer.read.all',
  'customer.write.own',
  'customer.write.team',
  'customer.write.all',
  'customer.delete',
  'csv.export',
  'admin.manage_users',
  'event.manage',
  'kpi.view.team',
  'kpi.view.all',
  'consent.grant',
  'consent.withdraw',
  'partner.handoff',
  'nav.intake',
  'nav.customers',
  'nav.looop',
  'nav.bills',
  'nav.refunds',
  'nav.cross_sell',
  'nav.solar_handoff',
  'nav.sales',
  'nav.kpi',
  'nav.fee_master',
  'nav.admin',
];

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  admin: ALL_PERMS,
  manager: [
    'customer.read.team',
    'customer.write.team',
    'kpi.view.team',
    'consent.grant',
    'consent.withdraw',
    'partner.handoff',
    'csv.export',
    'admin.manage_users',
    'event.manage',
    'nav.intake',
    'nav.customers',
    'nav.looop',
    'nav.bills',
    'nav.refunds',
    'nav.cross_sell',
    'nav.solar_handoff',
    'nav.sales',
    'nav.kpi',
    'nav.admin',
  ],
  field: [
    'customer.read.own',
    'customer.write.own',
    'consent.grant',
    'admin.manage_users',
    'event.manage',
    'nav.intake',
    'nav.customers',
    'nav.looop',
    'nav.cross_sell',
    'nav.admin',
  ],
  cs: [
    'customer.read.team',
    'nav.customers',
    'nav.looop',
    'nav.cross_sell',
  ],
  finance: [
    'customer.read.team',
    'kpi.view.team',
    'nav.customers',
    'nav.bills',
    'nav.refunds',
    'nav.sales',
    'nav.kpi',
    'nav.fee_master',
  ],
  // パートナーは自社で扱う顧客のみ（太陽光連携の流入分）。詳細は別途調整。
  partner: [
    'nav.customers',
    'nav.solar_handoff',
  ],
};

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: '管理者',
  manager: 'マネージャー',
  field: '現場スタッフ',
  cs: 'CS担当',
  finance: '経理・管理',
  partner: 'パートナー',
};

export function userHasPermission(user: SessionUser, perm: Permission): boolean {
  return user.roleCodes.some((code) => ROLE_PERMISSIONS[code]?.includes(perm));
}

export async function can(perm: Permission): Promise<boolean> {
  const user = await requireUser();
  return userHasPermission(user, perm);
}

export class ForbiddenError extends Error {
  constructor(perm: Permission) {
    super(`FORBIDDEN: missing permission ${perm}`);
    this.name = 'ForbiddenError';
  }
}

export async function requirePermission(perm: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!userHasPermission(user, perm)) throw new ForbiddenError(perm);
  return user;
}
