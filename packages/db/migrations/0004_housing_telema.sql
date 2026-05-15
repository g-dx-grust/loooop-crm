-- 住居属性（太陽光・蓄電池）
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS has_solar_panel text;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS has_battery       text;

-- 催事マスター: 会場+条件モデル・テレマ対応
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'event';
ALTER TABLE events ADD COLUMN IF NOT EXISTS condition   text;
