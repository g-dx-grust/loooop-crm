# 引き継ぎプロンプト: Supabase 移行 続き

> 次のセッション開始時、このファイル全体を Claude に貼り付けてください。

---

## 完了したこと（2026-05-13）

- [x] 1. `apps/web/.env.local` と `packages/db/.env` に **Supabase pooler URL** を設定
  - Transaction pooler (6543) → `apps/web/.env.local`
  - Session pooler (5432) → `packages/db/.env`
  - ホスト: `aws-1-ap-northeast-1.pooler.supabase.com`
  - ユーザー: `postgres.dpocuyowdxrbkhoguoku`
- [x] 2. Supabase 疎通確認 OK（PostgreSQL 17.6, IPv6 経由）
- [x] 3. `packages/db/src/index.ts` を Postgres クライアント (`postgres-js` 経由 drizzle) に切り替え
  - 新規: [packages/db/src/client-postgres.ts](packages/db/src/client-postgres.ts)
  - `client-sqlite.ts` / `schema-lite/` は残してある（一応戻れる）
- [x] 4. マイグレーションを再生成して Supabase に適用
  - 既存の 0000_*.sql / 0001_*.sql に整合性崩れがあったので、全部破棄して fresh 生成
  - 結果: `migrations/0000_rich_retro_girl.sql` 1 本のみ、21 テーブル作成済み
- [x] 5. `seed.ts` を Postgres 用に書き直し、Supabase へサンプルデータ投入
  - ID は決定論的 UUID v5 風（`uid('user-001')` 等）
  - ON CONFLICT DO NOTHING / DO UPDATE で冪等
  - `customers.phone_enc` 等の bytea カラムには Buffer を渡している
- [x] 6. Next.js dev server (`pnpm --filter web dev`) 起動確認 OK
  - `/login` 200 OK、middleware・compile エラーなし

## 残課題（重要）

**apps/web の typecheck が 15 件くらいコケます。** ランタイムで動く可能性は高いが、開発体験を保つには直したほうがいい。

原因は **SQLite → Postgres スキーマ移行に伴う型変化**：

| 影響 | SQLite (schema-lite) | Postgres (schema) | 対処方針 |
|---|---|---|---|
| `phoneEnc` / `phoneHash` / `emailEnc` / `phoneSubEnc` | `text` (string) | `bytea` (`Buffer`) | アプリ側で Buffer→string 変換 or 型定義側を `Buffer` に修正 |
| `latitude` / `longitude` | `real` (number) | `numeric` (postgres-js では string) | アプリ側で `parseFloat` / 数値変換 |
| `db.insert(...).values({}).run()` / `.all()` | drizzle-sqlite 固有 | postgres-js は `await db.insert(...)` のみ | `.run()` / `.all()` を削る |

主な該当ファイル（typecheck エラーから抜粋）:
- [apps/web/src/app/(admin)/customers/[id]/page.tsx](apps/web/src/app/(admin)/customers/[id]/page.tsx) (`.toFixed` を numeric の string に呼んでいる)
- [apps/web/src/app/(admin)/customers/queries.ts](apps/web/src/app/(admin)/customers/queries.ts) (`phoneEnc: Buffer` を `string` 型に流している)
- [apps/web/src/app/(admin)/solar-handoff/queries.ts](apps/web/src/app/(admin)/solar-handoff/queries.ts) (同上 + numeric)
- [apps/web/src/app/(mobile)/intake/actions.ts](apps/web/src/app/(mobile)/intake/actions.ts) (`.run()` / `.all()` を多用 + transaction の戻り型)
- [apps/web/src/app/api/customers/check-phone/route.ts](apps/web/src/app/api/customers/check-phone/route.ts) (`eq(users.phoneEnc, string)` ← Buffer 必須)

`pnpm --filter web typecheck` で再現できます。

## 次のセッションでやってほしいこと

1. **apps/web の typecheck エラーを潰す** — 上記 5 ファイルが主戦場
   - PII 層（`apps/web/src/lib/pii*.ts` 的なやつがあれば、bytea ↔ string の境界をそこに集約するのが王道）
   - 既に PII 暗号化のレイヤがあるなら、それの入出力を Buffer ベースに合わせる
2. **`pnpm --filter web build` を通す**
3. **ログインしてみる**: パスワード `Looop2026!` で `staff.a@partner.example.jp` / `partner.a@sunpower.example.jp` 経由
4. **顧客一覧 (`/customers`) が描画できるか確認**
5. **catch-all 暗号化**: 現状 seed は phone_enc に **平文** を Buffer 化して入れているだけなので、本物の AES-GCM レイヤが顧客詳細で復号失敗するはず。
   - 案 A: PII 層を「復号失敗ならマスク表示」にする（運用としても安全）
   - 案 B: seed 側で実際に AES-GCM 暗号化して入れる（PII_PEPPER と暗号鍵を共有する必要がある）

## ファイルの変更まとめ（コミット候補）

- `packages/db/src/index.ts` — Postgres クライアントを export
- `packages/db/src/client-postgres.ts` — 新規
- `packages/db/src/migrate.ts` — `dotenv/config` をやめて自前で `.env` 読む + SSL
- `packages/db/src/seed.ts` — Postgres 用に全面書き直し
- `packages/db/migrations/0000_rich_retro_girl.sql` + meta — fresh 再生成
- `apps/web/.env.local`, `packages/db/.env` — pooler URL（gitignore 済みなのでコミット不要）

旧 `0000_wonderful_wolfpack.sql` と古い snapshot/journal は git にあったが、再生成後の差分で **削除** されている。コミット時に注意。

## デザイン規約（CLAUDE.md の要約）

Lark カスタムアプリ内に埋め込まれる業務システム。**Lark Blue `#3370FF` を主色、角丸は最大 8px、影は基本なし、グラデ・絵文字装飾・派手な hero 禁止**。詳細は [CLAUDE.md](CLAUDE.md) 参照。今回の作業（DB接続）には UI 変更は含まれない想定。

## ユーザーについて

- メール: takahira@n-grust.co.jp
- セキュリティ意識あり: DBパスワード等は自分でファイルに貼る方針（チャットに貼るのを避ける）
- 「3か所貼って」のような明確な指示が必要なタイプ
- 専門用語より具体的な操作手順を好む
