# 03. 認証・権限（RBAC）

## 採用
- **Clerk**（Vercel Marketplace）
- 2FA: Clerkの TOTP / SMS を有効化（指示書 §18）
- パスワードポリシー: 12文字以上、英大小数字記号、過去パスワード再利用禁止
- 退職者停止: Clerk Dashboardで `Suspend user` → `users.left_at` を更新

## ロール（指示書 §16）
| code | 名称 | 主な権限 |
|---|---|---|
| admin | 管理者 | 全顧客閲覧/編集/CSV出力/権限管理 |
| manager | マネージャー | 自チームの顧客閲覧/編集、KPI閲覧 |
| field | 現場スタッフ | 自分が獲得した顧客の登録/編集 |
| cs | CS担当 | フォロー対象顧客の閲覧、対応履歴入力 |
| finance | 経理・管理 | 売上/入金/成果のみ閲覧 |
| partner | パートナー | 原則ログイン不可、限定情報のみ |

**CSV出力は admin のみ。**（指示書 §16 末尾）

## 権限モデル
- **ロールベース**: `roles` × `user_roles` × `scope`
- スコープ例: マネージャーは `{team_id: "..."}` で自チーム限定
- 現場スタッフは `created_by = self` の顧客のみ書き込み可（DBレベルでなくアプリ層で制御）

## アプリ実装

### ミドルウェア（`middleware.ts`）
```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isPublic = createRouteMatcher(['/login(.*)', '/api/health']);
export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});
```

### 権限チェックヘルパ（`packages/permissions`）
```ts
export type Permission =
  | 'customer.read.own' | 'customer.read.team' | 'customer.read.all'
  | 'customer.write.own' | 'customer.write.team' | 'customer.write.all'
  | 'customer.delete'
  | 'csv.export'
  | 'admin.manage_users'
  | 'kpi.view.team' | 'kpi.view.all'
  | 'consent.grant' | 'consent.withdraw'
  | 'partner.handoff';

export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  admin: [/* all */],
  manager: ['customer.read.team', 'customer.write.team', 'kpi.view.team'],
  field:   ['customer.read.own',  'customer.write.own',  'consent.grant'],
  cs:      ['customer.read.team'],
  finance: ['customer.read.team'/*, 売上閲覧のみのカラム制御 */],
  partner: [],
};

export async function can(userId: string, perm: Permission, ctx?: { customerId?: string }): Promise<boolean> { ... }
```

### サーバアクション側で必須チェック
```ts
'use server';
export async function exportSolarCsv(input: ExportInput) {
  const { userId } = await auth();
  if (!await can(userId, 'csv.export')) throw new ForbiddenError();
  // ...
  await audit.log({ action: 'export_csv', actor: userId, ... });
}
```

### 行レベルアクセス
- `field` の場合: `where created_by = userId` を強制
- `manager` の場合: `where customers.id IN (select customer_id from leads where staff_id IN team_members)` を join
- 共通の `scopedCustomerQuery(userId)` を作って全クエリで使い回す

## PIIマスキング
- 一覧画面の電話番号は `090-****-1234` 表示
- 詳細画面で「表示」ボタンを押すと完全表示＋ `audit_logs` に `view_pii` を記録
- finance ロールには電話番号を見せない（カラムレベル制御）

## 削除
- 物理削除なし。`deleted_at` を更新する論理削除のみ。
- 削除時はモーダルで「本当に削除しますか？」二段階確認。
- 削除アクションは `audit_logs` に保存。

## 監査ログとの統合
全ての書き込みSAは `withAudit(action, fn)` ラッパで包む：
```ts
export const updateCustomer = withAudit('update_customer', async (input) => { ... });
```

## チェックリスト
- [ ] Clerkで2FA必須化（admin/managerのみ強制でもよい）
- [ ] 退職処理SOP（Clerk Suspend + users.status='left' + Clerkセッション失効）
- [ ] ログイン履歴: Clerkの監査ログ + 自前 `audit_logs` の login も記録
- [ ] パスワードポリシー設定
- [ ] partner ロールはダッシュボードに入れない（middlewareで弾く）
