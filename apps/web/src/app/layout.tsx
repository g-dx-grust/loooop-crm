import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Looop CRM',
  description: 'Looopでんき催事販売事業の顧客管理システム',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
