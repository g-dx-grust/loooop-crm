import { Sidebar } from '@/components/layout/sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-bg-subtle">{children}</main>
    </div>
  );
}
