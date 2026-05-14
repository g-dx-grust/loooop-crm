import { redirect } from 'next/navigation';
import { getCurrentUser } from '@looop/auth';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@looop/permissions';
import { Sidebar } from '@/components/layout/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allowed = new Set<string>();
  for (const code of user.roleCodes) {
    for (const p of ROLE_PERMISSIONS[code] ?? []) allowed.add(p);
  }
  const primaryCode = user.roleCodes[0];
  const primaryRoleLabel = primaryCode ? (ROLE_LABELS[primaryCode] ?? 'ユーザー') : 'ユーザー';

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <Sidebar
        allowedPerms={Array.from(allowed)}
        displayName={user.displayName}
        roleLabel={primaryRoleLabel}
        email={user.email}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-bg-subtle">{children}</main>
    </div>
  );
}
