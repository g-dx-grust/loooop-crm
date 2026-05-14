import { redirect } from 'next/navigation';
import { getCurrentUser } from '@looop/auth';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'ログイン｜Looop CRM',
};

const LARK_ERRORS: Record<string, string> = {
  lark_no_code: 'Lark 認証がキャンセルされました。再度お試しください。',
  lark_config:  'Lark 設定が不完全です。管理者にお問い合わせください。',
  lark_token:   'Lark からトークンを取得できませんでした。再度お試しください。',
  lark_userinfo:'Lark からユーザー情報を取得できませんでした。再度お試しください。',
  lark_no_email:'Lark アカウントのメールアドレスを取得できませんでした。',
  lark_not_found:'このアカウントは登録されていません。管理者にお問い合わせください。',
  lark_error:   'Lark ログイン中にエラーが発生しました。再度お試しください。',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(params.next || '/customers');

  const larkError = params.error ? (LARK_ERRORS[params.error] ?? 'ログインに失敗しました。再度お試しください。') : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2">
          <div
            aria-hidden
            className="flex size-7 items-center justify-center rounded bg-brand-primary text-[13px] font-semibold text-white"
          >
            L
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">Looop CRM</span>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <h1 className="text-h1 text-text-primary">ログイン</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Looop でんき催事販売事業の顧客管理システム
          </p>
          <div className="mt-5">
            <LoginForm larkError={larkError} />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          ログインに関するお問い合わせは管理者まで
        </p>
      </div>
    </div>
  );
}
