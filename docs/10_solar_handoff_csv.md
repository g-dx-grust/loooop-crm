# 10. 太陽光連携・CSV出力

指示書 §8, §11, §12 に対応。**Phase 1 の最終ピース**（住所・同意・ログが先に完成している前提）。

## 連携対象の判定（`v_solar_handoff_eligible`）
すべて満たす顧客のみ：
- 最新の `solar_partner_share` 同意 = `granted`（撤回なし）
- `customers.phone_enc IS NOT NULL`
- `customer_addresses` に `google_maps_url`, `latitude`, `longitude`, `google_place_id` がある
- `customer_addresses.pin_confirmed = true`
- 連携ステータス = `pending`（または `consent_obtained`）→ 一覧で出す
- `customers.deleted_at IS NULL`

```sql
CREATE VIEW v_solar_handoff_eligible AS
SELECT c.id AS customer_id, c.display_id, c.name, ...,
       a.google_maps_url, a.latitude, a.longitude, a.google_place_id,
       lc.consent_status, lc.consent_text_version, lc.consented_at
FROM customers c
JOIN customer_addresses a ON a.customer_id = c.id AND a.is_primary
JOIN v_latest_consent lc
  ON lc.customer_id = c.id AND lc.consent_type = 'solar_partner_share'
WHERE c.deleted_at IS NULL
  AND lc.consent_status = 'granted'
  AND a.pin_confirmed = TRUE
  AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
  AND a.google_maps_url IS NOT NULL;
```

## 画面 `/solar-handoff`

### 一覧
- 列: 顧客名 / 電話 / 住所 / GoogleMapリンク / 緯度経度 / 同意取得日 / 太陽光興味度 / 連携先 / 連携ステータス
- フィルタ: 連携先・連携ステータス・会場・担当・興味度
- 一括選択 → [CSV出力] [連携済みに更新] [連携先を設定]

### CSV出力（admin限定）
- 出力前モーダル：
  - 連携先パートナー会社の選択（必須、`partner_companies`）
  - 出力対象顧客数の確認
  - 出力理由の入力（監査ログに残す）
- 確定で：
  1. CSVをサーバ生成（UTF-8 BOM付き、Excel互換）
  2. Vercel Blob（private）に `solar-csv/{exportId}.csv` で保管
  3. `csv_exports` 行作成（exporter / customer_ids / partner_id / record_count / file_blob_url）
  4. 各顧客に `partner_handoffs` 行作成（status=`handed_off`, csv_export_id=...）
  5. `audit_logs.action = 'export_csv'` 記録
  6. ブラウザにダウンロード（短期署名URL）

### CSV項目（指示書 §11 完全準拠）
```
lead_id, customer_id, customer_name, phone_number, postal_code, address_text,
google_formatted_address, google_maps_url, latitude, longitude, google_place_id,
map_pin_confirmed, map_pin_corrected, residence_type, ownership_type,
monthly_electric_bill, solar_interest_rank, battery_interest_rank,
preferred_contact_time, consent_to_solar_partner, consented_at, consent_text_version,
shared_partner_company, shared_at, source_event_name, source_event_date,
sales_rep, notes
```
- `map_pin_confirmed` / `map_pin_corrected` は `true/false`
- `consent_to_solar_partner` は `granted/withdrawn`
- `phone_number` はハイフン付きで（連携先の利便のため）
- 値にカンマ・改行・ダブルクォートが含まれる場合はRFC4180準拠でエスケープ

### 連携後操作
- 連携先架電済み・アポイント獲得・商談中・成約・失注 などの結果を `partner_handoffs.handoff_status` に追記
- 結果はアコーディオンで顧客詳細「太陽光連携」タブにも表示

## サーバアクション
```ts
'use server';
export async function exportSolarCsv(input: {
  partnerId: string,
  customerIds: string[],
  reason: string,
}) {
  await requirePermission('csv.export');                // admin only
  const eligible = await db.query.vSolarHandoffEligible.findMany({
    where: inArray(customerId, input.customerIds)
  });
  if (eligible.length !== input.customerIds.length) {
    throw new Error('一部の顧客が連携対象外です（同意・ピン未確認 等）');
  }

  const csv = buildCsv(eligible);
  const blob = await put(`solar-csv/${nanoid()}.csv`, csv, { access: 'private' });
  const exportId = await db.transaction(async (tx) => {
    const exp = await tx.insert(csvExports).values({
      exporterUserId, exportedAt: now, targetPartnerId: input.partnerId,
      recordCount: eligible.length, customerIds: eligible.map(e => e.customerId),
      fileBlobUrl: blob.url,
    }).returning();

    for (const e of eligible) {
      await tx.insert(partnerHandoffs).values({
        customerId: e.customerId, partnerCompanyId: input.partnerId,
        productType: 'solar', sharedItems: SHARED_ITEMS_LIST,
        sharedAt: now, sharedBy: userId,
        handoffStatus: 'handed_off', csvExportId: exp.id,
      });
    }
    return exp.id;
  });

  await audit.log({ action: 'export_csv', resourceId: exportId, ... reason });
  return { downloadUrl: getSignedDownloadUrl(blob.pathname, '5m') };
}
```

## CSV配布の安全性
- BlobはPrivate設定。直接URLでは取れない
- ダウンロードは Server Action 経由で短期署名URLを発行（5分）
- 出力CSVは7年保管（個人情報保護法的観点で運用ルール設定）

## 連携先API（Phase 2 候補）
- 一部の太陽光会社は受け取りAPIを持つ場合があるので、CSV出力をJSON POSTに置き換えるオプションを設計余地として残す

## 完了基準
- [ ] 同意なし／ピン未確認の顧客は対象一覧に出ない
- [ ] CSV出力で `csv_exports` と `partner_handoffs` が同一トランザクションで作成
- [ ] 出力CSVがExcelで文字化けせず開ける
- [ ] adminロール以外でCSV出力APIが403になる
- [ ] DBトリガで `partner_handoffs` の不正insert がブロックされる
