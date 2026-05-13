# 05. 住所入力 + Google Maps連携

指示書 §4, §5 に対応。**太陽光会社へ正確な位置を渡す** ことが目的。住所テキストだけで判断しない。

## ライブラリ
- `@react-google-maps/api` で JavaScript Maps SDK
- Geocoding は **サーバサイド** で行う（APIキーをブラウザに出さない）

## API キー運用
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: JS用。HTTPリファラ制限を必ずかける
- `GOOGLE_MAPS_SERVER_KEY`: Geocoding/Places API 用。VercelのIP制限 or Functions経由のみ
- 使用APIを最小化（Maps JS / Places / Geocoding のみ）

## ユーザフロー（指示書 §5 の理想形）
```
1. 郵便番号 → 自動補完（zipcloud等で都道府県/市区町村を埋める）
2. 番地・建物名を手入力
3. [住所を地図で確認] ボタン押下
   ↓
4. サーバが Geocoding API で google_formatted_address / lat / lng / place_id を取得
5. 地図にピンを表示（マーカー：ドラッグ可能）
6. スタッフがお客様に「この場所で合ってますか？」と確認
7. ズレている場合：
   - 地図を長押し or マーカードラッグで位置を修正
   - 「ピンを修正しました」トグルが ON になる
   - メモ欄に「玄関の位置」など記入可
8. [ピン位置を確定] ボタンで保存
   - latitude / longitude を更新
   - google_maps_url を `https://www.google.com/maps?q={lat},{lng}` で生成
   - pin_confirmed = true
   - accuracy_status = customer_verified or manually_corrected
```

## コンポーネント構成
```
AddressForm
 ├── PostalCodeField (auto-fill)
 ├── PrefectureSelect / CitySelect / StreetInput / BuildingInput
 ├── ResidenceTypeSelect (戸建て/集合住宅/店舗/その他/不明)
 ├── OwnershipTypeSelect (持ち家/賃貸/家族所有/不明)
 └── MapPinConfirmer
      ├── GeocodeButton                 → /api/geocode
      ├── GoogleMap (with marker)
      ├── DragToCorrect / LongPressMove
      ├── PinCorrectionNoteInput
      └── ConfirmButton                 → save lat/lng/place_id
```

## サーバAPI

### `POST /api/geocode`
```ts
input: { addressText: string }
output: {
  formattedAddress: string,
  lat: number, lng: number,
  placeId: string,
  accuracy: 'ROOFTOP'|'RANGE_INTERPOLATED'|'GEOMETRIC_CENTER'|'APPROXIMATE',
}
```
- レート制限：ユーザあたり 30 req/min
- 失敗時は再試行ボタン

### Geocodingの精度判定
Google APIの `location_type` を `accuracy_status` に反映：
- `ROOFTOP` → `google_auto`（高精度）
- それ以外 → `google_auto` だが UI で「精度が低いのでお客様に確認してください」警告

ピンドラッグ後は強制で `manually_corrected` に。

## 保存項目（customer_addresses）
| 列 | 値の決まり方 |
|---|---|
| postal_code | 入力 |
| prefecture / city / street / building | 入力 |
| address_text | 入力住所の連結 |
| google_formatted_address | Geocoding API のレスポンス |
| google_maps_url | `https://www.google.com/maps?q=${lat},${lng}&query_place_id=${placeId}` |
| latitude, longitude | 確定後の最終値 |
| google_place_id | Geocoding レスポンス |
| pin_confirmed | 確定ボタン押下で true |
| pin_corrected | ピンを動かしたら true |
| pin_correction_note | メモ任意 |
| accuracy_status | unconfirmed → google_auto → customer_verified or manually_corrected |
| residence_type / ownership_type | スタッフ入力 |

## UI上の禁則
- 太陽光連携用に：**pin_confirmed = false の顧客は CSV出力対象から除外** （詳細は doc 10）
- 一覧画面では「ピン未確認」フィルタを追加し、後追い修正できるように

## 性能・配慮
- 地図はステップ進行時に lazy load（initial bundle に乗せない）
- iOS Safariの省電力モードで `gestureHandling="greedy"` 推奨
- 1つの催事会場では多くの顧客が近隣 → 直前の地図中心を初期値に使うと体感が早い

## 完了基準
- [ ] 住所入力 → 地図表示 → ピン修正 → 保存が60秒以内
- [ ] 保存後の顧客詳細で `google_maps_url` を踏むとGoogleマップで開く
- [ ] `pin_confirmed=false` のCSV出力試行で 0件になる
- [ ] APIキーがブラウザに露出していない（DevToolsで確認）
