# 08. クロスセル管理

指示書 §7 に対応。Phase 1 ではデータ蓄積・基本UIに留め、強化はPhase 2。

## 対象商材
| product_type | 名称 |
|---|---|
| hikari | 光回線 |
| water | ウォーターサーバー |
| mobile | 携帯電話 |
| solar | 太陽光 |
| battery | 蓄電池 |

## ステータス
- not_proposed / proposed / interested / callback / applied / won / lost / excluded

## 見込み度
- A / B / C

## 画面

### `/cross-sell` 一覧
- 商材タブ + ステータスタブ
- 列: 顧客 / 担当 / 商材 / 見込み度 / ステータス / 次回アクション / 想定売上
- フィルタ: 商材・ステータス・見込み度・担当者・次回アクション期日

### 顧客詳細の「クロスセル」タブ
- 商材ごとの行（5商材固定で表示、無いものは「未提案」扱いで追加）
- 想定売上・実売上・粗利を入力
- メモ・対応履歴

## 太陽光・蓄電池の特殊扱い
- ここで「興味あり」かつ「太陽光連携同意あり」の場合、太陽光連携対象（doc 10）の候補に自動的に乗る
- ただし **同意がなければ何も連携しない**（DBレベルで保証）

## 自動生成（Phase 1 では任意）
- Looop契約完了で太陽光・蓄電池の opportunity を `not_proposed` で生成（trigger or app層）

## サーバアクション
```ts
'use server';
export const upsertOpportunity = withAudit('upsert_opportunity', async (input) => {
  await requirePermission('customer.write.team', { customerId: input.customerId });
  // upsert by (customer_id, product_type)
});
```

## Phase 2 強化候補
- 次回アクション期日リマインド（Cron + 通知）
- 商材別パイプラインKPI（doc 12）
- 自動スコアリング（年齢層・電気料金・住居種別から）

## 完了基準
- [ ] 5商材 × ステータス遷移が記録される
- [ ] 顧客詳細から1分以内に商材を入力できる
- [ ] 一覧で次回アクション期日順に並べ替えられる
