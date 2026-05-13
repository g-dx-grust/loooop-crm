# 01. 環境構築・初期セットアップ

## 前提
- Node.js 24 LTS（ローカルもVercelもこれに統一）
- pnpm 9+
- Vercel CLI 53.2.0+（既存51.2.0なら `pnpm add -g vercel@latest`）
- gh CLI（GitHub操作用）

## ステップ1: リポジトリ初期化
```bash
pnpm create next-app@latest apps/web \
  --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --no-experimental-https
```
- App Router / TypeScript / Tailwind / ESLint / src-dir すべて有効化
- `apps/web` 配下にNextを置き、後でモノレポ化（pnpm workspaces）

## ステップ2: pnpm workspace + Turborepo（軽量）
ルートに `pnpm-workspace.yaml`、`turbo.json` を配置。
```yaml
packages:
  - apps/*
  - packages/*
```

## ステップ3: Vercelプロジェクト作成・連携
```bash
vercel login
vercel link
vercel env pull .env.local   # 各種シークレットをローカルに同期
```

## ステップ4: Marketplace 統合
Vercel Dashboard → Storage / Integrations から：
1. **Neon Postgres**（Marketplace）→ `DATABASE_URL` が自動投入される
2. **Clerk**（Marketplace）→ `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 自動投入
3. **Vercel Blob**（プロジェクト設定 → Storage → Create Blob Store, *Private*）

## ステップ5: 主要パッケージ
```bash
pnpm add drizzle-orm pg zod react-hook-form @hookform/resolvers
pnpm add @clerk/nextjs
pnpm add @vercel/blob
pnpm add @react-google-maps/api
pnpm add date-fns
pnpm add -D drizzle-kit @types/pg
```
shadcn/ui:
```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input form dialog dropdown-menu table tabs sheet toast
```

## ステップ6: 環境変数（.env.local）
```
# DB
DATABASE_URL=...                 # Neon (Marketplaceが投入)

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...   # JS APIキー (HTTPリファラ制限を必ずかける)
GOOGLE_MAPS_SERVER_KEY=...            # Geocoding等のサーバ用 (IP制限)

# Blob
BLOB_READ_WRITE_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CONSENT_TEXT_VERSION=v1.0           # 同意文面バージョン管理
```

## ステップ7: vercel.ts（推奨）
```ts
import { type VercelConfig } from '@vercel/config/v1';
export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'pnpm turbo build --filter=web',
  installCommand: 'pnpm install --frozen-lockfile',
  crons: [
    // 例: 同意撤回通知の集計ジョブ（Phase 2以降）
    // { path: '/api/cron/consent-summary', schedule: '0 9 * * *' }
  ],
};
```

## ステップ8: 型・lint・format
- TypeScript strict 有効
- ESLint: next/core-web-vitals + 機微情報誤コミット防止に `no-restricted-imports`
- Prettier
- `husky` + `lint-staged` で pre-commit に型チェック・lint

## ステップ9: CI（GitHub Actions）
- PR毎: `pnpm lint && pnpm typecheck && pnpm test`
- Vercel Preview Deployment は自動
- mainマージ時のみ Production 自動promote（Rolling Releases検討）

## チェックリスト
- [ ] `pnpm dev` で `http://localhost:3000` 表示
- [ ] `vercel env pull` で `.env.local` 生成
- [ ] DB接続確認: `pnpm drizzle-kit generate` が走る
- [ ] Clerk のサインアップ画面が表示される
- [ ] Google Maps JSがロードされる（ダミーページで地図表示）
