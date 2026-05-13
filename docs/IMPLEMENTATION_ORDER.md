# 実装順序：直列／並列マップ

AIで実装するときに **どこを直列で固め、どこから並列にバラせるか** を明示。
Phase 1 を最短で出すため、依存だけは厳守して、それ以外はAIエージェントを並列で走らせる。

---

## 全体タイムライン

```
Phase 0 ─→ Phase 1 並列バースト ─→ Phase 1 締め ─→ Phase 2 ─→ Phase 3
(直列)        (並列)                  (直列)         (並列)     (並列)
```

---

## Phase 0: 基盤（**完全直列**、約 1〜2日）

依存：すべてあとから全機能の土台。先に固めない限り並列に出せない。

```
[0.1] プロジェクト初期化 (Next.js 16 / TS / Tailwind / pnpm workspace)
   ↓
[0.2] Vercelリンク + Marketplace統合
        - Neon Postgres
        - Clerk
        - Vercel Blob (private)
   ↓
[0.3] DBスキーマ作成 + マイグレ初期投入  (docs/02)
        - 全テーブル + ビュー + トリガ (consents 連携可否)
        - シード: roles, partner_companies (ダミー), events
   ↓
[0.4] 認証基盤 (Clerk middleware) + RBACヘルパ + audit ヘルパ  (docs/03, 11)
        - withAudit() / requirePermission() / scopedCustomerQuery()
   ↓
[0.5] 共通レイアウト・shadcn UIキット・トースト・モーダル基盤
```

**ここまで完了するまで Phase 1 は始めない**。逆にここを丁寧に作れば、Phase 1 のAIエージェントは型に守られて並列で動ける。

---

## Phase 1: MVP本体（並列 → 最後だけ直列で締める、約 2〜3週間）

### 並列ブロック A〜F（依存なし、同時にAIエージェントに割れる）

| Track | doc | 範囲 | 依存 |
|---|---|---|---|
| **A** 顧客フォーム | 04 | `/intake` 5ステップ + 重複チェック + 写真アップロード + 下書き | Phase 0 |
| **B** 住所＆地図 | 05 | 郵便番号→Geocode→ピン修正→保存 のコンポーネント | Phase 0 |
| **C** 顧客一覧/詳細 | 06 | `/customers`, `/customers/[id]` 全タブ（同意・連携タブはスタブでOK） | Phase 0 |
| **D** Looop管理 | 07 | `/looop` + 顧客詳細Looopタブ | Phase 0 |
| **E** 同意管理 | 09 | チェックボックスUI + consent_text_versions + 撤回フロー | Phase 0 |
| **F** 監査ログ閲覧 | 11 | `/admin/audit` 一覧・フィルタ・diff表示 | Phase 0 |

→ **A は B と E に内部依存**（フォームの中で使う）が、**コンポーネントの口（props）を先に決めれば** Aは Bと E のスタブ実装で並列に進められる。
   - 推奨：Phase 0 の最後に `MapPinConfirmer.tsx` と `ConsentCheckboxes.tsx` の **空コンポーネント（型と props のみ）** を切っておく。AはこれをimportしてB/Eが完成するのを待たない。

### 並列ブロック G（A〜Fと並列で進めて良い）

| Track | doc | 範囲 |
|---|---|---|
| **G** クロスセル管理 | 08 | 顧客詳細クロスセルタブ + 一覧（最低限） |

### 直列ブロック（Phase 1の締め、A〜Gが揃ってから着手）

| Step | doc | 範囲 | 依存 |
|---|---|---|---|
| **H** 太陽光連携・CSV出力 | 10 | `/solar-handoff` + CSV出力Server Action + DBトリガ最終確認 | A, B, E, F が必要（住所完備＋同意＋監査） |

**Hで初めて事業価値（太陽光会社へ正確に渡す）が完成する**。
Hの動作確認テストはPhase 1 のリリース判定（住所3件×同意あり/なし×ピン確認 を組み合わせて全パターン）。

### Phase 1 並列マップ図
```
Phase 0 完了
   │
   ├──► Track A (フォーム)            ┐
   ├──► Track B (住所・地図)            │
   ├──► Track C (一覧・詳細)            │  ※すべて同時着手可
   ├──► Track D (Looop)                │
   ├──► Track E (同意)                 │
   ├──► Track F (監査閲覧)              │
   └──► Track G (クロスセル)           ┘
                  │
                  ▼ (全部マージ後)
            Track H (太陽光CSV)  ← Phase 1 締め
                  │
                  ▼
              Phase 1 リリース
```

### 並列ワーク時のルール（AIエージェント向け）
- **DBマイグレは直列**：複数Trackが同時にスキーマ変更すると壊れる。スキーマ変更は Phase 0 でほぼ確定させ、追加が必要なら main にPR→マージ→他Trackがpullの順
- **共通モジュール**（`packages/permissions`, `packages/audit`, `packages/db`）への変更は単一Trackがオーナー
- **インテグレーションPR** を別途切り、A〜Gのマージ順を整理する人間/エージェントを置く
- 各Trackは **モックデータ + Storybook** で見た目を確認できるところまで持っていく

---

## Phase 2: 事業開始後（並列、約 2〜4週間）

| Track | doc | 内容 | 依存 |
|---|---|---|---|
| KPI ダッシュボード | 12 | mv_daily_kpi + チャート + 個人ダッシュボード | Phase 1 |
| クロスセル強化 | 08 | 自動オポチュニティ生成 / リマインド / パイプライン分析 | Phase 1 |
| SMS/LINE 連携 | - | 通知系統 | Phase 1 |
| 自動リマインド | - | Cron + 通知（次回アクション期日） | Phase 1 |
| 電気料金明細 OCR | - | 画像 → 月額 推定 (AI Gateway) | Phase 1 |
| 太陽光会社 API 連携 | 10 | CSV → JSON POST 切替 | Phase 1 (Hの差し替え) |

→ いずれもPhase 1 の上に乗るのみで相互依存薄い。ほぼ完全並列。

---

## Phase 3: 拡大時（並列）
- AIによる会場分析 / 見込み度スコアリング（AI Gateway + 履歴データ）
- 営業トーク改善レポート（録音→文字起こし→要約、要法的整理）
- パートナー / CS / コールセンター連携
- 自動レポート配信

---

## まとめ：直列／並列の鉄則

| 種類 | ルール |
|---|---|
| **必ず直列** | Phase 0 全部、DBマイグレ、Phase 1の最後（太陽光CSV）、本番昇格 |
| **必ず並列OK** | Phase 1 の Track A〜G、Phase 2 のサブトラック、UIストーリー |
| **判断ポイント** | 共通モジュールに触るかどうか / DBスキーマに触るかどうか |

AIエージェントを最大効率で動かすコツ：
1. **Phase 0 で型・契約（props / Zod スキーマ / DB スキーマ）を決め切る**
2. 各Trackには **そのdocファイルだけ** を渡し、共通モジュールは凍結ステータスで読み取り専用にする
3. **Track Hだけは人間レビュー必須**（事業価値の検証ポイントなので）
4. **マイグレ衝突防止**のため、スキーマ変更PRは「1日1本」「マージ後に他Trackが rebase」運用
