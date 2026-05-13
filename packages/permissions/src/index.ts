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
  | 'kpi.view.team'
  | 'kpi.view.all'
  | 'consent.grant'
  | 'consent.withdraw'
  | 'partner.handoff';

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
  'kpi.view.team',
  'kpi.view.all',
  'consent.grant',
  'consent.withdraw',
  'partner.handoff',
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
  ],
  field: ['customer.read.own', 'customer.write.own', 'consent.grant'],
  cs: ['customer.read.team'],
  finance: ['customer.read.team', 'kpi.view.team'],
  partner: [],
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
