# 13. セキュリティ・運用

指示書 §18 に対応 + 本番運用のため。

## 認証・アカウント
- Clerk: パスワード12文字以上、英数記号、漏洩DB照合（pwned password）
- 2FA: admin / manager / finance は **必須**、field / cs は推奨
- セッション有効期間: 12時間（業務時間内）、再認証は重要操作（CSV出力・権限変更）で都度
- 退職者処理SOP:
  1. Clerk で `Suspend user`
  2. `users.status = 'left'`, `left_at = now()`
  3. アクティブセッションの強制失効（Clerk API）
  4. 担当顧客は manager にエスカレーション

## 通信・データ
- HTTPS強制（Vercel既定）
- DBはNeonの暗号化（at-rest）+ TLS（in-transit）
- PII列（phone/email）はアプリ層で AES-GCM 暗号化、`phone_hash` は SHA-256（pepper付き）
- pepperは Vercel Env で管理、ローテーション計画を documents/operations/secrets.md に記載

## ファイル
- Vercel Blob は **Private** で運用
- ダウンロードはServer Actionで短期署名URL（5分）
- ファイル一覧APIに権限チェック必須

## 入力・出力
- 全エンドポイントで Zod バリデーション
- SQLは Drizzle のパラメタライズドのみ（生SQLは禁止、または明示レビュー）
- HTML出力は React の自動エスケープに依存、`dangerouslySetInnerHTML` は禁止

## レート制限
- ログイン: 1分5回
- Geocoding: ユーザあたり 30 req/min
- CSV出力: 1人 5回/分（誤操作・流出リスク低減）
- 実装: Upstash Redis (Marketplace) or Vercel KV後継、`@vercel/firewall` のレート制限ルール

## DB バックアップ
- Neon の自動バックアップ（PITR）有効化
- 毎日のスナップショットを別リージョン保管（手動 or Cron）
- 月1回 リストアテスト

## モニタリング
- Vercel Logs + Observability
- Sentry（エラートラッキング）
- Vercel BotID で botアクセスを可視化
- 異常検知（CSV出力多発・大量view_pii）→ Slack通知

## 削除・データ保持
- 顧客データ: 論理削除のみ。物理削除はオプトイン（管理者承認 + 監査ログ）
- 同意撤回後は太陽光連携用クエリから即除外（doc 09）
- 個人情報の保管期間ポリシーをドキュメント化（要法務）

## デプロイ運用
- main ブランチへのマージ → Production自動 promote
- Rolling Releases で5分カナリア → 全体（β）
- Preview deployment で動作確認、E2Eが落ちたらブロック
- vercel.ts でcron / rewrites / headers を集中管理

## 環境分離
- `development` (local): ローカルPostgres or Neon dev branch
- `preview`: Neon preview branch（PR毎に分離）
- `production`: 本番Neon

`vercel env pull --environment=preview/production` で同期。

## インシデント対応
- 漏洩時の連絡経路: 法務 → 個人情報保護委員会通知 → 影響顧客連絡
- 監査ログから影響範囲の特定（CSV出力対象顧客の `csv_exports.customer_ids` を参照）
- 必要なら全 admin の追加認証を即時要求

## 法令対応
- 個人情報保護法: 利用目的の通知、第三者提供の同意、開示請求への対応
- 開示請求対応: `/admin/customers/[id]/disclosure` で全データをエクスポートする機能（Phase 2）
- 委託先（Neon, Clerk, Vercel）は委託先管理として記録

## 完了基準
- [ ] 退職フローが手順化されている
- [ ] PII暗号化キーがVercel Env管理
- [ ] レート制限が効いている（テスト）
- [ ] バックアップから復元できる（リストアリハーサル）
- [ ] 異常検知のSlack通知が来る
