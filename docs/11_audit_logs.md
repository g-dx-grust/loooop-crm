# 11. 監査ログ

指示書 §17, §18 に対応。**個人情報を扱う以上、ログは法令対応・事故調査の最終証拠**。

## 残すべきイベント（指示書 §17）
| action | trigger |
|---|---|
| login / logout / login_failed | Clerk webhook + サーバ側 |
| view_customer | 顧客詳細ページ表示 |
| view_pii | 電話/メール等のマスク解除表示 |
| update_customer | 顧客基本情報の編集 |
| create_customer | 新規登録 |
| delete_customer | 論理削除 |
| update_address / update_pin | 住所・ピン修正 |
| update_looop_status | Looopステータス変更 |
| update_cross_sell | クロスセル変更 |
| consent_grant | 同意取得 |
| consent_withdraw | 同意撤回 |
| consent_withdraw_notify | 撤回連絡（連携先へ） |
| export_csv | CSV出力 |
| handoff_create | partner_handoffs 行作成 |
| handoff_update | 連携ステータス変更 |
| file_upload / file_download / file_delete | 添付ファイル操作 |
| permission_change | ユーザロール変更 |

## ログスキーマ（再掲、doc 02 と同じ）
```ts
audit_logs(
  id BIGSERIAL,
  actor_user_id UUID,
  action TEXT,
  resource_type TEXT,            -- customer | looop_contract | consent | csv_export | ...
  resource_id UUID,
  diff JSONB,                    -- { before, after } PIIはハッシュ
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

## ヘルパ実装
```ts
// packages/audit/src/index.ts
export async function logAudit(args: {
  action: string;
  resourceType?: string;
  resourceId?: string;
  diff?: unknown;
  reason?: string;
}) {
  const { userId, ip, ua } = await getRequestContext();
  await db.insert(auditLogs).values({
    actorUserId: userId,
    action: args.action,
    resourceType: args.resourceType,
    resourceId: args.resourceId,
    diff: args.diff ? sanitizeDiff(args.diff) : null,
    ipAddress: ip,
    userAgent: ua,
  });
}

export function withAudit<TArgs extends any[], TRet>(
  action: string,
  fn: (...a: TArgs) => Promise<TRet>
) {
  return async (...args: TArgs) => {
    try {
      const ret = await fn(...args);
      await logAudit({ action, /* derive resourceId from ret */ });
      return ret;
    } catch (e) {
      await logAudit({ action: `${action}_failed`, diff: { error: String(e) } });
      throw e;
    }
  };
}
```

## diffの作り方
- `before / after` を保存するが、**PII列はハッシュ化** または **マスキング**
- 例: `phone` の変更なら `{ before: 'sha256:...', after: 'sha256:...' }`
- 表示時は admin が「ハッシュは確認用、実値はDBの履歴トリガから取得」運用に

## CSV出力ログ専用ビュー `/admin/audit/csv-exports`
- 出力者 / 出力日時 / 対象件数 / 対象顧客ID（先頭10件＋省略表示） / 連携先 / 出力理由 / ダウンロードURL（短期署名）
- ダウンロードは admin のみ、再ダウンロード回数も記録

## 閲覧UI `/admin/audit`
- フィルタ: 期間 / actor / action / resource_type / resource_id
- 行クリックで diff のJSONビューア
- 全期間検索のため `audit_logs` は月次パーティション化

## 保管期間
- 監査ログ: 5〜7年保管
- CSV出力ファイル本体: 7年（運用ルール）
- 顧客の論理削除: 退会後一定期間で物理削除可（要法務確認）

## アラート（Phase 2）
- 短時間のCSV出力連発、view_pii 大量発生 → Slack通知
- 退職者アカウントからのアクセス → 即時アラート

## 完了基準
- [ ] 全ての書き込みSAが `withAudit` で囲まれている
- [ ] PII列を含む変更がハッシュ化されて保存される
- [ ] adminがCSV出力履歴を月別に追える
- [ ] パーティション分割が動作している（月をまたぐINSERT）
