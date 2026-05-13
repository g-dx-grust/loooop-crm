export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg-base">
      <div className="mx-auto w-full max-w-2xl px-4 py-4">{children}</div>
    </div>
  );
}
