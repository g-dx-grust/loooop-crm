# 00. システム全体概要

## ゴール
Looopでんき催事販売事業のCRM。
**「顧客情報を正確に取る → 同意を取る → 太陽光会社へ安全に連携する」** を最短で実現し、現場で使われ、事業を成功させる。

## 最重要ポイント（指示書 §21 を要約）
1. **住所の正確性**：テキスト住所だけでなく Google Maps URL / 緯度経度 / Place ID / ピン確認済みフラグを必ず保持。
2. **同意管理**：太陽光会社へ渡せるのは第三者提供同意ありの顧客のみ。バックエンドで強制。
3. **連携履歴**：誰の情報を、いつ、どの会社に、どの項目で渡したかを必ず残す。
4. **KPI 分析**：会場別／担当者別／商材別で勝ちパターンを可視化。

## 技術スタック（固定）
| 領域 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js 16 (App Router) | Vercelネイティブ、Server Actions、Cache Components |
| 言語 | TypeScript (strict) | 個人情報を扱うので型保証必須 |
| DB | Neon Postgres (Vercel Marketplace) | サーバーレス、ブランチでステージング可、Vercel連携 |
| ORM | Drizzle ORM | TS型推論強い、マイグレ管理が軽量 |
| 認証 | Clerk (Vercel Marketplace) | 組織/権限/2FA/SSOが標準、退職者停止も即時 |
| ファイル | Vercel Blob (private) | 電気料金明細の機密保管 |
| UI | shadcn/ui + Tailwind | スマホ対応・拡張性 |
| フォーム | React Hook Form + Zod | バリデーション・入力途中保存 |
| 地図 | Google Maps JavaScript API + Places API | ピン修正UI、Place ID取得 |
| ホスティング | Vercel (Fluid Compute) | デフォルトNode.js 24、300sタイムアウト |
| ロギング | Vercel Logs + 自前 audit_logs テーブル | 監査ログは法令対応のため自前保持 |

## ディレクトリ構成（予定）
```
apps/web/                        # Next.js本体
  src/app/
    (public)/login/              # 認証
    (mobile)/intake/             # 催事現場フォーム（スマホ最適化）
    (admin)/customers/           # 顧客一覧・詳細
    (admin)/looop/               # Looop申込管理
    (admin)/cross-sell/
    (admin)/solar-handoff/       # 太陽光連携画面
    (admin)/kpi/                 # ダッシュボード
    (admin)/admin/               # 権限・マスタ・監査ログ
    api/                         # Route Handlers / Server Actions
packages/
  db/                            # Drizzleスキーマ・マイグレーション
  ui/                            # shadcn共有コンポーネント
  permissions/                   # RBACヘルパ
docs/                            # 本ドキュメント
```

## 開発フェーズの全体像
- **Phase 0（基盤・直列）**: プロジェクト初期化、DB、認証、RBAC
- **Phase 1（MVP・並列展開可）**: 指示書 §1 の18機能。最後だけ太陽光CSV出力を直列で締める
- **Phase 2（事業開始後）**: KPI、クロスセル強化、SMS/LINE、API連携
- **Phase 3（拡大時）**: AIスコア、自動レポート、コールセンター連携

詳細は `IMPLEMENTATION_ORDER.md` を参照。

## ドキュメント一覧
| # | ファイル | 内容 |
|---|---|---|
| 00 | overview.md | 全体概要（このファイル） |
| 01 | tech_stack_setup.md | 環境構築・初期セットアップ手順 |
| 02 | database_schema.md | テーブル定義・マイグレ |
| 03 | auth_rbac.md | 認証・権限・2FA |
| 04 | customer_form.md | 催事現場入力フォーム |
| 05 | address_googlemaps.md | 住所入力＋Google Maps連携 |
| 06 | customer_list_detail.md | 一覧・詳細画面 |
| 07 | looop_application.md | Looop申込管理 |
| 08 | cross_sell.md | クロスセル管理 |
| 09 | consent_management.md | 第三者提供同意 |
| 10 | solar_handoff_csv.md | 太陽光連携・CSV出力 |
| 11 | audit_logs.md | 監査ログ |
| 12 | kpi_dashboard.md | KPIダッシュボード（Phase 2） |
| 13 | security_ops.md | セキュリティ・運用 |
| - | IMPLEMENTATION_ORDER.md | 直列／並列の実装順序 |
