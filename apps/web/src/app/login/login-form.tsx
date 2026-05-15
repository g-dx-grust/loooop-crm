'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import { passwordLoginAction } from './actions';

export function LoginForm({ serverError }: { serverError?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') || '/customers';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(serverError ?? null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await passwordLoginAction(fd);
      if (!result.success) {
        setError(result.error ?? 'ログインに失敗しました');
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-status-error/30 bg-status-errorSoft px-3 py-2"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-error" aria-hidden />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      ) : null}

      {/* Lark SSO */}
      <a
        href={`/api/auth/lark${next !== '/customers' ? `?next=${encodeURIComponent(next)}` : ''}`}
        className={cn(
          'flex h-10 w-full items-center justify-center gap-2 rounded border border-border bg-white px-3 text-sm font-medium text-text-primary',
          'transition-colors hover:bg-bg-subtle',
          pending && 'pointer-events-none opacity-50',
        )}
      >
        <LarkIcon className="size-4" />
        <span>Lark でログイン</span>
      </a>

      {/* Divider */}
      <div className="flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-tertiary">またはメールアドレスで</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <Label htmlFor="email" required>メールアドレス</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.jp"
              className="h-10 pl-8 text-[16px] md:text-sm"
              disabled={pending}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" required>パスワード</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 pl-8 pr-9 text-[16px] md:text-sm"
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-text-tertiary hover:bg-bg-subtle hover:text-text-secondary"
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={pending}
        >
          ログイン
        </Button>
      </form>

      <p className="text-xs leading-relaxed text-text-tertiary">
        アカウントはシステム管理者が発行します。
      </p>
    </div>
  );
}

function LarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="16" height="16" rx="3" fill="#00D6B9" />
      <path
        d="M5 4.5C5 4.22 5.22 4 5.5 4H6.5C6.78 4 7 4.22 7 4.5V10H10.5C10.78 10 11 10.22 11 10.5V11.5C11 11.78 10.78 12 10.5 12H5.5C5.22 12 5 11.78 5 11.5V4.5Z"
        fill="white"
      />
    </svg>
  );
}
