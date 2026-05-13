/**
 * 監査ログヘルパ。docs/11_audit_logs.md に対応。
 *   - logAudit(): 単発記録
 *   - withAudit(): Server Action を包んで自動記録
 * PII を含む差分は sanitizeDiff でハッシュ化する想定（未実装：呼び出し側でマスク）。
 */

import { auditLogs, db } from '@looop/db';
import { getCurrentUser } from '@looop/auth';

export interface AuditArgs {
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  diff?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(args: AuditArgs): Promise<void> {
  const user = await getCurrentUser();
  await db.insert(auditLogs).values({
    actorUserId: user?.id ?? null,
    action: args.action,
    resourceType: args.resourceType ?? null,
    resourceId: args.resourceId ?? null,
    diff: (args.diff as Record<string, unknown>) ?? null,
    ipAddress: args.ipAddress ?? null,
    userAgent: args.userAgent ?? null,
  });
}

export function withAudit<TArgs extends unknown[], TRet>(
  action: string,
  fn: (...a: TArgs) => Promise<TRet>,
  resolveResource?: (ret: TRet, args: TArgs) => { type?: string; id?: string },
): (...a: TArgs) => Promise<TRet> {
  return async (...args: TArgs) => {
    try {
      const ret = await fn(...args);
      const r = resolveResource?.(ret, args);
      await logAudit({ action, resourceType: r?.type, resourceId: r?.id });
      return ret;
    } catch (e) {
      await logAudit({ action: `${action}_failed`, diff: { error: String(e) } });
      throw e;
    }
  };
}
