# 09. 第三者提供同意管理

指示書 §9, §10 に対応。**この機能の正しさが事業の生命線**。

## 重要原則
1. **同意は2種類** に分けて管理する（指示書 §9）
   - `personal_info_use`（個人情報の取得・利用）→ 必須
   - `solar_partner_share`（太陽光・蓄電池販売会社への第三者提供）→ 任意
2. **撤回は履歴を残す**：consents テーブルは追記専用。`granted` の後に `withdrawn` 行を追加するスタイルに統一
3. **`solar_partner_share` の最新が `granted` でない顧客は、CSV出力・連携履歴作成ができない**（DB & アプリで二重防御）

## 同意文面の管理
- バージョン管理：`consent_text_version` 列に `'v1.0'` のような識別子
- 文面はコード内 or DBに（推奨：DBに `consent_text_versions` テーブルを別途）
- `.env` の `CONSENT_TEXT_VERSION` を「現在のデフォルト版」として参照
- 文面は法務確認後に確定（指示書 §10 に案あり）

### consent_text_versions（追加テーブル）
```sql
id UUID PK
version TEXT UNIQUE
consent_type TEXT                       -- personal_info_use | solar_partner_share
body MARKDOWN/TEXT
effective_from TIMESTAMPTZ
created_at
```

## 同意取得UI（フォーム内）
```
┌────────────────────────────────────┐
│ □ 個人情報の取得・利用に同意する     │ ← 必須。チェック無しでは登録不可
│   [文面を表示] (モーダル)             │
├────────────────────────────────────┤
│ □ 太陽光・蓄電池販売会社への        │ ← 任意
│    情報提供に同意する                │
│   [文面を表示] (モーダル)             │
└────────────────────────────────────┘
```
- お客様自身でタップしてもらうのが原則
- スタッフが代理でチェックした場合も `consents.consented_by` にスタッフID、`memo` に「代理入力」を記録
- 取得時刻 / IP / UA を併記

## サーバ側の保存
```ts
await db.insert(consents).values([
  {
    customerId, consentType: 'personal_info_use',
    consentStatus: 'granted',
    consentTextVersion: env.CONSENT_TEXT_VERSION,
    consentedAt: now, consentedBy: userId,
    ipAddress, userAgent,
  },
  ...(input.consentSolarPartner ? [{
    consentType: 'solar_partner_share', consentStatus: 'granted', ...
  }] : []),
]);
```

## 撤回フロー
- 顧客詳細 → 同意履歴タブ → 「撤回する」ボタン
- モーダルで撤回理由（自由記述 + プリセット）を入力
- consents に `consent_status = 'withdrawn'` の新規行を追加
- 撤回が `solar_partner_share` の場合：
  - `partner_handoffs` のうち未連携(`pending`等)を `consent_withdrawn` に更新
  - 連携先会社に **撤回連絡を送る運用フロー**を発動（メール下書き生成）
  - Slack等へ通知（Phase 2）

## 最新同意の参照
ビュー：
```sql
CREATE VIEW v_latest_consent AS
SELECT DISTINCT ON (customer_id, consent_type)
  customer_id, consent_type, consent_status, consent_text_version,
  consented_at, consented_by, withdrawn_at
FROM consents
ORDER BY customer_id, consent_type, consented_at DESC, id DESC;
```

## 連携可否判定
```ts
export async function canShareWithSolarPartner(customerId: string): Promise<boolean> {
  const row = await db.query.vLatestConsent.findFirst({
    where: and(eq(...customerId), eq(consentType, 'solar_partner_share'))
  });
  return row?.consent_status === 'granted';
}
```

## DBトリガ（多層防御）
```sql
CREATE FUNCTION trg_check_solar_consent() RETURNS trigger AS $$
DECLARE latest TEXT;
BEGIN
  SELECT consent_status INTO latest
  FROM v_latest_consent
  WHERE customer_id = NEW.customer_id AND consent_type = 'solar_partner_share';
  IF latest IS DISTINCT FROM 'granted' THEN
    RAISE EXCEPTION 'consent missing for solar_partner_share';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER partner_handoffs_check_consent
  BEFORE INSERT ON partner_handoffs
  FOR EACH ROW
  WHEN (NEW.product_type IN ('solar','battery'))
  EXECUTE FUNCTION trg_check_solar_consent();
```

## ログ
- 同意取得: `audit_logs.action = 'consent_grant'`
- 同意撤回: `consent_withdraw`
- 撤回時に連携先へ通知した記録: `partner_handoffs.memo` + `audit_logs.action = 'consent_withdraw_notify'`

## 完了基準
- [ ] チェックボックス1なしでは登録不可（クライアント＋サーバ）
- [ ] チェックボックス2なしの顧客が `partner_handoffs` insert で**DBエラー**になる
- [ ] 撤回が consents に追記され、過去の granted 行は残る
- [ ] CSV出力API が撤回済を 0件で返す
