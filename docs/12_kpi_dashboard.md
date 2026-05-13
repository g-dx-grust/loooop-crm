# 12. KPIダッシュボード（Phase 2）

指示書 §15 に対応。Phase 1 ではデータが正確に貯まる仕組みを最優先し、ダッシュボード自体は Phase 2。

## KPI 一覧
### 経営KPI
- Looop獲得件数（申込数 / 契約完了数 / 開通完了数）
- Looop売上 = unit_price × 開通完了 (revenue_month集計)
- キャンセル率 = キャンセル / 申込
- 有効契約数（ステータス=contracted/opened）
- 太陽光トスアップ数 = `partner_handoffs` (product_type=solar) 件数
- 太陽光アポ率 = `appointment` ステータス / トスアップ数
- 併売件数（cross_sell_opportunities.status=won）
- 顧客単価
- 会場別収益
- 担当者別生産性

### 現場KPI（活動量、要：簡易カウンタ機能）
- 声かけ数 / 着座数 / ヒアリング数 → 別テーブル `field_activity_counters`（イベント別×日別×担当者別×種別）
- Looop申込数 / 太陽光同意取得数 / 併売提案数 / 併売成約数
- キャンセル数 / クレーム数

## 分析軸
- 会場別 / 担当者別 / 日付別 / 商材別 / エリア別 / チーム別
- すべてピボット可能なように、**ファクトテーブル設計** にする

## ファクトテーブル設計（Phase 2 で追加）
集計用ビュー or マテリアライズドビュー：
```sql
CREATE MATERIALIZED VIEW mv_daily_kpi AS
SELECT
  DATE_TRUNC('day', l.created_at)::date AS day,
  l.event_id, l.staff_id,
  COUNT(*) FILTER (WHERE lc.status='applied') AS looop_applied,
  COUNT(*) FILTER (WHERE lc.status='opened')  AS looop_opened,
  COUNT(*) FILTER (WHERE lc.status='cancelled') AS looop_cancelled,
  SUM(CASE WHEN lc.status='opened' THEN lc.unit_price END) AS revenue,
  COUNT(DISTINCT ph.id) FILTER (WHERE ph.product_type='solar') AS solar_handoffs
FROM leads l
LEFT JOIN looop_contracts lc ON lc.lead_id = l.id
LEFT JOIN partner_handoffs ph ON ph.customer_id = l.customer_id
GROUP BY 1,2,3;
```
- 1日1回 Cron で `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- リアルタイム性が必要な指標はオンザフライSQL

## ルート `/kpi`
- タブ: サマリ / 会場別 / 担当者別 / 商材別 / エリア別 / 期間比較
- フィルタ: 期間 / 会場 / 担当 / チーム
- 指標カード + ライン/バー チャート（recharts）
- CSVダウンロード（admin/manager）

## 権限
- admin: 全社
- manager: 自チーム + 自会場のみ
- finance: 売上関連カードのみ
- field/cs: 自分のスコア（個人ダッシュボード）

## 個人ダッシュボード `/me`
- 現場スタッフ向けに「自分の今月の獲得件数 / 太陽光同意取得数 / クロスセル成約」を可視化
- ゲーミフィケーション要素（ランキング 任意）

## 完了基準（Phase 2）
- [ ] mv_daily_kpi が日次更新される
- [ ] 会場別×期間で比較できる
- [ ] managerが他チームを見られない
- [ ] CSVダウンロードがaudit logに残る
