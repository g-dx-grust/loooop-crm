'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { passwordLoginAction } from './actions';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') || '/customers';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-status-error/30 bg-status-errorSoft px-3 py-2"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-error" aria-hidden />
          <p className="text-sm text-status-error">{error}</p>
        </div>
      ) : null}

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
