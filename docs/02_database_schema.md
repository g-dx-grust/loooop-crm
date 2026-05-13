# 02. データベーススキーマ

## 設計原則
- **論理削除**: 全テーブルに `deleted_at TIMESTAMPTZ` を持つ。物理削除は禁止。
- **監査列**: `created_at`, `updated_at`, `created_by`, `updated_by` を必須。
- **PII列の暗号化**: `phone`, `phone_sub`, `email` は pgcrypto で列暗号化（または Neonの透過暗号化＋アプリ層マスキング）。
- **タイムゾーン**: 全部 `TIMESTAMPTZ`（DBはUTC、表示はAsia/Tokyo）。
- **IDはUUID v7**: 並び順保証＋外部漏れ耐性。
- **マイグレ**: `drizzle-kit` で自動生成、PRレビュー必須。

## テーブル一覧（指示書 §19 + 拡張）
| # | テーブル | 役割 |
|---|---|---|
| 1 | users | 社員アカウント（Clerk userId と1:1） |
| 2 | roles / user_roles | 権限ロール |
| 3 | events | 催事会場 |
| 4 | customers | 顧客基本 |
| 5 | customer_addresses | 住所＋Google Maps |
| 6 | leads | 催事リード |
| 7 | looop_contracts | Looopでんき申込 |
| 8 | cross_sell_opportunities | クロスセル |
| 9 | consents | 同意（個人情報利用＋第三者提供 を分けて記録） |
| 10 | partner_companies | 太陽光等の連携先マスタ |
| 11 | partner_handoffs | 連携履歴 |
| 12 | activities | 対応履歴 |
| 13 | files | 添付（電気料金明細、写真） |
| 14 | audit_logs | 監査ログ |
| 15 | csv_exports | CSV出力履歴 |

## 1. users
```sql
id UUID PK
clerk_user_id TEXT UNIQUE NOT NULL
display_name TEXT NOT NULL
email TEXT NOT NULL
phone TEXT
team_id UUID                          -- マネージャーのチーム単位
status TEXT NOT NULL DEFAULT 'active' -- active|suspended|left
joined_at TIMESTAMPTZ
left_at TIMESTAMPTZ                   -- 退職日（停止）
created_at, updated_at, deleted_at
```

## 2. roles / user_roles
```sql
roles(
  id UUID PK,
  code TEXT UNIQUE                    -- admin|manager|field|cs|finance|partner
  name TEXT
)
user_roles(user_id, role_id, scope JSONB)  -- 例: {"team_id": "..."}
```

## 3. events（催事会場）
```sql
id UUID PK
event_name TEXT
venue_name TEXT
venue_address TEXT
event_date DATE
area TEXT
cost INT
memo TEXT
created_at, updated_at, deleted_at
```

## 4. customers
```sql
id UUID PK                                  -- = customer_id
display_id TEXT UNIQUE                      -- 表示用 (例: C-2026-0001)
name TEXT NOT NULL
kana TEXT
phone_enc BYTEA NOT NULL                    -- 暗号化
phone_hash BYTEA UNIQUE NOT NULL            -- 重複チェック用 SHA-256(正規化済み)
phone_sub_enc BYTEA
email_enc BYTEA
age_range TEXT                              -- '20s'|'30s'|'40s'|'50s'|'60s+'
household_info TEXT
preferred_contact_time TEXT
memo TEXT
created_by UUID REFERENCES users(id)
created_at, updated_at, deleted_at
```
**重複チェック**: `phone_hash` に UNIQUE index（論理削除済みは除外する partial index）。
```sql
CREATE UNIQUE INDEX customers_phone_hash_active
  ON customers(phone_hash) WHERE deleted_at IS NULL;
```

## 5. customer_addresses
```sql
id UUID PK
customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT
postal_code TEXT
prefecture TEXT
city TEXT
street TEXT
building TEXT
address_text TEXT                       -- 入力住所全文
google_formatted_address TEXT
google_maps_url TEXT
latitude NUMERIC(10,7)
longitude NUMERIC(10,7)
google_place_id TEXT
pin_confirmed BOOLEAN DEFAULT FALSE
pin_corrected BOOLEAN DEFAULT FALSE
pin_correction_note TEXT
accuracy_status TEXT                    -- unconfirmed|google_auto|customer_verified|manually_corrected
residence_type TEXT                     -- detached|apartment|store|other|unknown
ownership_type TEXT                     -- owned|rented|family|unknown
is_primary BOOLEAN DEFAULT TRUE
created_at, updated_at, deleted_at
```

## 6. leads
```sql
id UUID PK
customer_id UUID REFERENCES customers(id)
event_id UUID REFERENCES events(id)
staff_id UUID REFERENCES users(id)
lead_status TEXT                        -- new|contacted|qualified|disqualified
source TEXT                             -- 催事|紹介|その他
created_at
```

## 7. looop_contracts
```sql
id UUID PK
customer_id UUID
lead_id UUID
application_id TEXT
current_power_company TEXT
current_plan TEXT
monthly_electric_bill INT               -- 円
status TEXT                             -- not_proposed|proposed|interested|applied|under_review|contracted|opened|cancelled|excluded
application_date DATE
contract_date DATE
opened_date DATE
cancel_date DATE
cancel_reason TEXT
unit_price INT DEFAULT 30000
revenue_month TEXT                      -- 'YYYY-MM'
payment_status TEXT                     -- unbilled|billed|paid
created_at, updated_at, deleted_at
```

## 8. cross_sell_opportunities
```sql
id UUID PK
customer_id UUID
product_type TEXT                       -- hikari|water|mobile|solar|battery
interest_rank TEXT                      -- A|B|C
status TEXT                             -- not_proposed|proposed|interested|callback|applied|won|lost|excluded
next_action_date DATE
expected_revenue INT
actual_revenue INT
gross_profit INT
memo TEXT
created_at, updated_at, deleted_at
```

## 9. consents
```sql
id UUID PK
customer_id UUID
consent_type TEXT NOT NULL              -- personal_info_use | solar_partner_share
consent_status TEXT NOT NULL            -- granted|withdrawn
consent_text_version TEXT NOT NULL      -- 'v1.0'
consented_at TIMESTAMPTZ NOT NULL
consented_by UUID REFERENCES users(id)  -- 取得スタッフ
ip_address INET
user_agent TEXT
withdrawn_at TIMESTAMPTZ
withdrawal_reason TEXT
memo TEXT
created_at
```
**最新同意の参照**: ビュー `v_latest_consent` を作り、`(customer_id, consent_type)` の最新行を返す。

## 10. partner_companies
```sql
id UUID PK
name TEXT
product_type TEXT                       -- solar|battery
contact_email TEXT
active BOOLEAN DEFAULT TRUE
created_at, updated_at
```

## 11. partner_handoffs
```sql
id UUID PK
customer_id UUID
partner_company_id UUID
product_type TEXT
shared_items JSONB                      -- 渡した項目のリスト
shared_at TIMESTAMPTZ
shared_by UUID REFERENCES users(id)
handoff_status TEXT                     -- not_proposed|interested|consent_obtained|pending|handed_off|partner_called|appointment|negotiating|won|lost|excluded|consent_withdrawn
csv_export_id UUID                      -- どのCSV出力に含まれたか
partner_result TEXT
memo TEXT
created_at, updated_at, deleted_at
```

## 12. activities
```sql
id UUID PK
customer_id UUID
staff_id UUID
activity_type TEXT                      -- call|visit|email|memo|status_change
content TEXT
next_action_date DATE
created_at
```

## 13. files
```sql
id UUID PK
customer_id UUID
file_type TEXT                          -- electric_bill|consent_signature|other
blob_url TEXT                           -- Vercel Blob URL (private)
blob_pathname TEXT                      -- 削除用
mime_type TEXT
size_bytes INT
uploaded_by UUID
uploaded_at TIMESTAMPTZ
deleted_at TIMESTAMPTZ
```

## 14. audit_logs
```sql
id BIGSERIAL PK
actor_user_id UUID
action TEXT                             -- login|view_customer|update_customer|export_csv|...
resource_type TEXT
resource_id UUID
diff JSONB                              -- 変更前後 (PIIはハッシュ)
ip_address INET
user_agent TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
```
- パーティション: 月単位（pg_partman or 手動）

## 15. csv_exports
```sql
id UUID PK
exporter_user_id UUID
exported_at TIMESTAMPTZ
target_partner_id UUID
record_count INT
customer_ids UUID[]                     -- 出力対象のスナップショット
filter_snapshot JSONB
file_blob_url TEXT                      -- 出力したCSV自体も保管
```

## ビュー / 制約
- `v_solar_handoff_eligible`: 太陽光連携対象者を返す（同意・電話・住所・ピン確認・ステータスを満たす者）
- DB制約として **「solar_partner_share の granted がない customer は partner_handoffs に insert できない」** トリガを設置（多層防御）

## マイグレーション運用
- Drizzleで定義 → `drizzle-kit generate` → PR
- 本番適用は CI から `drizzle-kit migrate`
- 破壊的変更は事前に Neon ブランチで dry-run

## インデックス（最低限）
- `customers(phone_hash)` UNIQUE
- `customers(name, kana)` 検索用 GIN（pg_trgm）
- `customer_addresses(customer_id)`
- `leads(event_id, staff_id, created_at)`
- `looop_contracts(status, revenue_month)`
- `audit_logs(actor_user_id, created_at DESC)`
- `partner_handoffs(handoff_status, customer_id)`
