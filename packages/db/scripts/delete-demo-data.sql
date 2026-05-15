-- ============================================================
-- Looop CRM デモデータ削除スクリプト
-- 作成日: 2026-05-15
-- 再実行安全: WHERE 条件により冪等（IF EXISTS / WHERE 付き）
--
-- 【削除対象】
--   顧客データ:
--     - display_id が 'DC-%' で始まる顧客（seedデモ顧客）
--     - name / kana に 'デモ' or 'テスト' を含む顧客
--     - ※上記以外の手動追加デモ顧客は下部の「追加クリーンアップ」を参照
--   催事: events テーブルの全件（本番運用開始前を想定）
--   partner_companies: name に 'デモ' / 'テスト' を含む → inactive
--   teams:             name に 'デモ' / 'テスト' を含む → inactive
--   users: 保持対象6名以外を suspended に変更
--
-- 【保持対象マスタ】
--   fee_master / roles / consent_text_versions
--
-- 【保持対象ユーザー（6名）】
--   kawaguchi@n-grust.co.jp
--   kato@n-grust.co.jp
--   miyazawa@n-grust.co.jp
--   kimuchichige192@gmail.com
--   looptestkanri@n-grust.co.jp
--   looptestgenba@n-grust.co.jp
--
-- 【実行方法】
--   psql $DATABASE_URL -f delete-demo-data.sql
--   または npm run delete-demo (packages/db/src/run-delete-demo.ts)
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- デモ顧客 ID を一時テーブルへ収集
-- ────────────────────────────────────────────────────────────
CREATE TEMP TABLE IF NOT EXISTS _demo_customer_ids AS
SELECT id
FROM customers
WHERE display_id LIKE 'DC-%'
   OR name  LIKE '%デモ%'
   OR name  LIKE '%テスト%'
   OR kana  LIKE '%デモ%'
   OR kana  LIKE '%テスト%';

-- ────────────────────────────────────────────────────────────
-- [1] partner_handoffs (RESTRICT FK → customers)
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM partner_handoffs
  WHERE customer_id IN (SELECT id FROM _demo_customer_ids)
  RETURNING id
)
SELECT format('[1] partner_handoffs   削除: %s 件', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [2] electricity_bills (RESTRICT FK → customers)
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM electricity_bills
  WHERE customer_id IN (SELECT id FROM _demo_customer_ids)
  RETURNING id
)
SELECT format('[2] electricity_bills  削除: %s 件', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [3] refunds (RESTRICT FK → customers)
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM refunds
  WHERE customer_id IN (SELECT id FROM _demo_customer_ids)
  RETURNING id
)
SELECT format('[3] refunds            削除: %s 件', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [4] looop_contracts (RESTRICT FK → customers)
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM looop_contracts
  WHERE customer_id IN (SELECT id FROM _demo_customer_ids)
  RETURNING id
)
SELECT format('[4] looop_contracts    削除: %s 件', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [5] leads (RESTRICT FK → customers)
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM leads
  WHERE customer_id IN (SELECT id FROM _demo_customer_ids)
  RETURNING id
)
SELECT format('[5] leads              削除: %s 件', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [6] customers を削除
--     CASCADE 自動削除: customer_addresses / cross_sell_opportunities
--                       consents / activities / files
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM customers
  WHERE id IN (SELECT id FROM _demo_customer_ids)
  RETURNING id
)
SELECT format('[6] customers          削除: %s 件  (CASCADE: addresses/cross_sell/consents/activities/files)', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [7] 催事を全件削除（本番運用開始前を想定）
--     leads.event_id は SET NULL のため安全
-- ────────────────────────────────────────────────────────────
WITH deleted AS (
  DELETE FROM events
  RETURNING id
)
SELECT format('[7] events             削除: %s 件', COUNT(*)) AS result FROM deleted;

-- ────────────────────────────────────────────────────────────
-- [8] デモ partner_companies を inactive 化
-- ────────────────────────────────────────────────────────────
WITH updated AS (
  UPDATE partner_companies
  SET active = false
  WHERE (name LIKE '%デモ%' OR name LIKE '%テスト%')
    AND active = true
  RETURNING id
)
SELECT format('[8] partner_companies  inactive化: %s 件', COUNT(*)) AS result FROM updated;

-- ────────────────────────────────────────────────────────────
-- [9] デモ teams を inactive 化
-- ────────────────────────────────────────────────────────────
WITH updated AS (
  UPDATE teams
  SET active = false
  WHERE (name LIKE '%デモ%' OR name LIKE '%テスト%')
    AND active = true
  RETURNING id
)
SELECT format('[9] teams              inactive化: %s 件', COUNT(*)) AS result FROM updated;

-- ────────────────────────────────────────────────────────────
-- [10] 保持対象外ユーザーを suspended 化
-- ────────────────────────────────────────────────────────────
WITH updated AS (
  UPDATE users
  SET status = 'suspended'
  WHERE email NOT IN (
    'kawaguchi@n-grust.co.jp',
    'kato@n-grust.co.jp',
    'miyazawa@n-grust.co.jp',
    'kimuchichige192@gmail.com',
    'looptestkanri@n-grust.co.jp',
    'looptestgenba@n-grust.co.jp'
  )
  AND status != 'suspended'
  RETURNING id
)
SELECT format('[10] users             suspended化: %s 件', COUNT(*)) AS result FROM updated;

-- ────────────────────────────────────────────────────────────
-- クリーンアップ
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS _demo_customer_ids;

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 残存件数確認（COMMIT 後）
-- ────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM customers                WHERE deleted_at IS NULL) AS customers_remaining,
  (SELECT COUNT(*) FROM looop_contracts          WHERE deleted_at IS NULL) AS looop_contracts_remaining,
  (SELECT COUNT(*) FROM cross_sell_opportunities WHERE deleted_at IS NULL) AS cross_sell_remaining,
  (SELECT COUNT(*) FROM electricity_bills        WHERE deleted_at IS NULL) AS electricity_bills_remaining,
  (SELECT COUNT(*) FROM events                   WHERE deleted_at IS NULL) AS events_remaining,
  (SELECT COUNT(*) FROM users                    WHERE status = 'active')  AS users_active,
  (SELECT COUNT(*) FROM users                    WHERE status = 'suspended') AS users_suspended;

-- ============================================================
-- ※ 名前パターンに該当しない手動追加デモ顧客を削除する場合は
--    以下を必要に応じて実行（対象を十分確認してから実行すること）:
--
-- BEGIN;
-- -- 全顧客・関連データを削除（本番データが存在しないことを確認してから）
-- DELETE FROM looop_contracts;
-- DELETE FROM leads;
-- DELETE FROM customers;  -- CASCADE で addresses/cross_sell/consents/activities/files も削除
-- DELETE FROM events;
-- COMMIT;
-- ============================================================
