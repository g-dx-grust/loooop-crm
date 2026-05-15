/**
 * RBAC ヘルパ。
 * role -> permission のマップを定義し、現在のユーザの role から判定する。
 * docs/03_auth_rbac.md と一致させる。
 *
 * ロール種別: admin（全体管理者）/ agency_admin（代理店管理者）/ field（現場スタッフ）
 */

import { requireUser, type SessionUser } from '@looop/auth';
import type { RoleCode } from '@looop/db';

export type Permission =
  | 'customer.read.own'
  | 'customer.read.all'
  | 'customer.write.own'
  | 'customer.write.all'
  | 'customer.delete'
  | 'csv.export'
  | 'admin.manage_users'
  | 'event.manage'
  | 'kpi.view.all'
  | 'consent.grant'
  | 'consent.withdraw'
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
  | 'nav.events'
  | 'nav.admin';

const ALL_PERMS: Permission[] = [
  'customer.read.own',
  'customer.read.all',
  'customer.write.own',
  'customer.write.all',
  'customer.delete',
  'csv.export',
  'admin.manage_users',
  'event.manage',
  'kpi.view.all',
  'consent.grant',
  'consent.withdraw',
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
  'nav.events',
  'nav.admin',
];

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  admin: ALL_PERMS,
  agency_admin: [
    'customer.read.all',
    'customer.write.all',
    'consent.grant',
    'consent.withdraw',
    'nav.intake',
    'nav.customers',
    'nav.looop',
    'nav.cross_sell',
    'nav.sales',
  ],
  field: [
    'customer.read.own',
    'customer.write.own',
    'consent.grant',
    'nav.intake',
    'nav.customers',
    'nav.looop',
    'nav.cross_sell',
  ],
};

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: '管理者',
  agency_admin: '代理店管理者',
  field: '現場スタッフ',
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
