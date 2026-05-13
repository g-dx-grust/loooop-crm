# 07. Looopでんき申込管理

指示書 §6 に対応。

## ルート
- `/looop` 一覧（ステータス別タブ）
- `/customers/[id]` の Looop タブ（個別操作）

## ステータス遷移
```
未提案 → 提案済み → 興味あり → 申込済み → 審査中 → 契約完了 → 開通完了
                                                          ↘ キャンセル
                                                          ↘ 対象外
```
- 状態変更履歴は `activities`（type=`status_change`）に必ず記録
- キャンセル時はキャンセル理由必須

## 売上ロジック
- 既定単価: 30,000円（`unit_price` 上書き可、admin/managerのみ）
- 売上計上月 `revenue_month`: 開通完了月をデフォルトに（運用に応じて契約月でも可、設定で切替）
- 入金ステータス: `unbilled | billed | paid`
- 月別サマリ: `/looop/revenue?month=YYYY-MM`（管理者・経理）

## 一覧画面 `/looop`
- タブ: 全件 / 未提案 / 提案中 / 申込中 / 契約済 / 開通済 / キャンセル / 売上計上待ち / 入金未確認
- 列: 顧客 / 担当者 / 会場 / 申込日 / 開通予定 / 売上単価 / 売上計上月 / 入金
- フィルタ: 担当者・会場・売上計上月・入金ステータス
- CSV出力（売上集計用、admin only）

## バッチ的操作
- 一括ステータス変更（`admin`のみ）。理由必須
- 例: 申込済みのうち、開通日が1ヶ月以上前の行を「開通完了」へ昇格（マニュアル一括承認）

## 入力UI
- ステータス変更モーダル
- 開通予定日 / 完了日のDatePicker
- キャンセル理由はテキスト + 既定理由のセレクト（重複/契約解約済/連絡不可/その他）

## サーバアクション例
```ts
'use server';
export const updateLooopStatus = withAudit('update_looop', async (id, next, reason) => {
  await requirePermission('customer.write.team', { customerId });
  await db.transaction(async (tx) => {
    await tx.update(looopContracts).set({ status: next, ... }).where(...);
    await tx.insert(activities).values({ activityType: 'status_change', content: `${prev}→${next} ${reason}` });
  });
});
```

## クロスセル連動
- Looop申込ステータスが「契約完了」になった顧客に対し、自動で
  `cross_sell_opportunities` の太陽光・蓄電池レコードを `not_proposed` で生成（運用次第でフラグ切替）

## 完了基準
- [ ] ステータス変更履歴が `activities` に必ず残る
- [ ] キャンセル理由なしでは保存できない
- [ ] 売上集計が月別で正しく出る（テストデータで検証）
- [ ] 単価変更は admin/manager のみ
