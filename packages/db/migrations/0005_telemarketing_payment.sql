-- テレマ獲得フラグ
ALTER TABLE looop_contracts
  ADD COLUMN IF NOT EXISTS is_telemarketing_acquisition boolean NOT NULL DEFAULT false;

-- 支払い方法: クレカをデフォルトに変更（既存レコードは bank_account のまま）
ALTER TABLE looop_contracts
  ALTER COLUMN payment_method SET DEFAULT 'credit_card';
