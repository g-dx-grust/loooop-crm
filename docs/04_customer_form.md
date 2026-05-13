# 04. 催事現場入力フォーム

指示書 §1, §2, §3 に対応。**スマホで1件3分以内** がKPI。

## ルート
- `/intake` （ログイン後の現場スタッフ用デフォルト画面）
- レスポンシブ。スマホ/タブレット縦持ち優先で設計。

## 画面構成（ステップ式 / Wizard）
モバイルでは長いフォームより **5ステップのウィザード** で。各ステップで自動保存（`navigator.sendBeacon` で下書きsave）。

### Step 1: 基本情報
- お客様名（必須）
- フリガナ
- 電話番号（必須・即時重複チェック）
- 予備電話番号
- メールアドレス
- 年齢層（チップ選択：20代/30代/40代/50代/60代以上）
- 世帯構成（チップ選択：単身/夫婦/家族/その他）
- 連絡希望時間（チップ：午前/午後/夕方/夜/いつでも）

### Step 2: 住所＋Google Maps
→ 詳細は [05_address_googlemaps.md](./05_address_googlemaps.md)
住居種別／所有区分もここで入力。

### Step 3: 電気・Looop申込
- 現在の電力会社
- 現在のプラン
- 月間電気料金（数字、円）
- 電気料金明細写真アップロード（任意、最大5枚、自動圧縮）
- Looop申込ステータス（未提案/提案済み/興味あり/申込済み...）

### Step 4: クロスセル興味
チェックボックス（複数選択可）：
- 光回線 / ウォーターサーバー / 携帯電話 / 太陽光 / 蓄電池

各商材ごとに見込み度（A/B/C）を任意で。

### Step 5: 同意取得
→ 詳細は [09_consent_management.md](./09_consent_management.md)
- チェックボックス1: 個人情報の取得・利用に同意する（必須）
- チェックボックス2: 太陽光・蓄電池販売会社への情報提供に同意する（任意）
- 同意文面はモーダルで全文表示、`CONSENT_TEXT_VERSION` を記録
- お客様自身でチェックさせる方針（スタッフ代行も記録上は許容）

### 確認画面
- 全項目を一画面に表示
- 「登録」ボタンで確定 → 顧客一覧に戻る

## 仕様詳細

### 電話番号の重複チェック
- 入力中に debounce(400ms) で `/api/customers/check-phone` を叩く
- サーバ側: `phone_hash = sha256(normalizePhone(input))` で `customers` を検索（active分のみ）
- レスポンス: `{ duplicated: boolean, existingCustomerId?: string }`
- 重複時はトースト＋既存顧客への遷移リンクを表示
- 登録ボタン押下時にもう一度サーバ側で UNIQUE 制約に依存して最終チェック

### 自動下書き保存
- localStorageに `intake_draft_<userId>` でフォーム値を保持
- 30秒ごとに Server Action `saveDraft(input)` を呼んで `intake_drafts` テーブル（簡易テーブル別途）に保管
- ページ復帰時に下書きから復元

### 写真アップロード
- `<input type="file" accept="image/*" capture="environment">` でカメラ起動
- クライアントで `browser-image-compression` で長辺1920px・JPEG 80%に圧縮
- `@vercel/blob` の client upload (`upload()` with `handleUploadUrl`) でPrivateにアップロード
- アップロード完了で `files` に行を作る

### バリデーション（Zod）
```ts
const intakeSchema = z.object({
  name: z.string().min(1).max(100),
  kana: z.string().max(100).optional(),
  phone: z.string().regex(/^0\d{9,10}$/),
  phoneSub: z.string().regex(/^0\d{9,10}$/).optional(),
  email: z.string().email().optional(),
  ageRange: z.enum(['20s','30s','40s','50s','60s+']).optional(),
  // ...
  eventId: z.string().uuid(),  // 必須
  consentPersonalInfo: z.literal(true),  // 必須同意
  consentSolarPartner: z.boolean(),
});
```

### 担当者・催事会場の自動紐付け
- ログインユーザを `staff_id` に固定
- 催事会場は最後に選んだ会場を localStorage に保持して既定値に。1日中同じ会場で使う前提
- 会場切替は画面右上のセレクタから

### モバイル最適化
- フォーム部品はすべて min-height 48px（タップしやすい）
- 数字入力は `inputMode="numeric"`、電話は `type="tel"`
- ステップ間遷移はスクロールではなくスライド
- オフライン耐性: 通信失敗時はトーストで警告し、下書きをlocalStorageに残す

## Server Actions
```ts
'use server';
export async function createCustomer(input: IntakeInput) {
  const userId = await requireUser();
  const phoneHash = sha256(normalizePhone(input.phone));

  return await db.transaction(async (tx) => {
    const customer = await tx.insert(customers).values({...}).returning();
    await tx.insert(customerAddresses).values({...});
    await tx.insert(leads).values({ customerId: customer.id, eventId: input.eventId, staffId: userId });
    if (input.looopStatus) await tx.insert(looopContracts).values({...});
    await tx.insert(consents).values([
      { customerId, consentType: 'personal_info_use', consentStatus: 'granted', ... },
      ...(input.consentSolarPartner ? [{ consentType: 'solar_partner_share', ... }] : []),
    ]);
    return customer;
  });
}
```

## 完了基準
- [ ] スマホ（iOS Safari / Android Chrome）で1件3分以内に登録できる
- [ ] 重複電話で登録できないことをE2Eで確認
- [ ] 通信切断 → 復帰で下書きが復元される
- [ ] 写真5枚 + 全項目で1分以内に完了
- [ ] 必須同意なしでは登録ボタンが押せない
