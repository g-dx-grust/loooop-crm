/**
 * Lark Bot メッセージ送信ユーティリティ。
 *
 * Tenant Access Token を取得してチャットにメッセージを送る。
 * 必要な環境変数: LARK_APP_ID, LARK_APP_SECRET
 * 通知先チャット: LARK_NOTIFY_CHAT_ID (デフォルト: oc_cf513448fd9903357ccc45cca476d58a)
 *
 * 失敗しても呼び出し元の処理を止めないよう、エラーはログのみ。
 */

const NOTIFY_CHAT_ID =
  process.env.LARK_NOTIFY_CHAT_ID ?? 'oc_cf513448fd9903357ccc45cca476d58a';

async function getTenantAccessToken(): Promise<string | null> {
  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;
  if (!appId || !appSecret) return null;

  const res = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { code: number; tenant_access_token?: string };
  if (data.code !== 0 || !data.tenant_access_token) return null;
  return data.tenant_access_token;
}

export async function sendLarkAcquisitionNotification(params: {
  customerName: string;
  staffName: string | null;
  eventName: string | null;
  venueName: string | null;
  isTelema: boolean;
}): Promise<void> {
  try {
    const token = await getTenantAccessToken();
    if (!token) return;

    const acquisitionType = params.isTelema ? 'テレマコード獲得' : '催事獲得';
    const eventLabel = params.venueName
      ? `${params.eventName ?? ''} (${params.venueName})`
      : (params.eventName ?? '—');
    const staff = params.staffName ?? '—';

    const text = [
      `🎉 新規獲得報告`,
      `種別：${acquisitionType}`,
      `催事：${eventLabel}`,
      `担当：${staff}`,
    ].join('\n');

    const res = await fetch(
      'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receive_id: NOTIFY_CHAT_ID,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        }),
      },
    );

    if (!res.ok) {
      console.error('[lark-notify] HTTP error:', res.status);
      return;
    }

    const data = (await res.json()) as { code: number; msg?: string };
    if (data.code !== 0) {
      console.error('[lark-notify] API error:', data.code, data.msg);
    }
  } catch (err) {
    console.error('[lark-notify] unexpected error:', err);
  }
}
