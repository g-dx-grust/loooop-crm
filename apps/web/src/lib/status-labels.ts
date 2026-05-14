import type { BadgeTone } from '@/components/ui/badge';

export const LOOOP_STATUS_LABELS: Record<string, string> = {
  applied:        '申込済',
  cancelled:      'キャンセル',
  matching_error: 'マッチングエラー',
  terminated:     '解約',
  completed:      '完了',
};

export const LOOOP_STATUS_TONE: Record<string, BadgeTone> = {
  applied:        'info',
  cancelled:      'error',
  matching_error: 'error',
  terminated:     'neutral',
  completed:      'success',
};

export const LOOOP_PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_account: '口座',
  other: '上記以外',
};

export const LOOOP_PLAN_LABELS: Record<string, string> = {
  smart_time_one_lighting: 'スマートタイムONE（電灯）',
};

export const REFUND_REASON_LABELS: Record<string, string> = {
  application_cancelled: '申込キャンセル',
  early_termination: '6ヶ月以内解約',
  fraud: '不正取得',
  forced_enrollment: '強制入会',
  short_term_inducement: '短期解約誘導',
  rule_violation: 'ルール違反',
  other: 'その他',
};

export const CROSS_SELL_STATUS_LABELS: Record<string, string> = {
  not_proposed: '未提案',
  proposed: '提案済み',
  interested: '興味あり',
  callback: '後日連絡',
  applied: '申込済み',
  won: '成約',
  lost: '失注',
  excluded: '対象外',
};

export const CROSS_SELL_STATUS_TONE: Record<string, BadgeTone> = {
  not_proposed: 'neutral',
  proposed: 'warning',
  interested: 'info',
  callback: 'warning',
  applied: 'info',
  won: 'success',
  lost: 'neutral',
  excluded: 'neutral',
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  hikari: '光回線',
  water: 'ウォーターサーバー',
  mobile: '携帯電話',
  solar: '太陽光',
  battery: '蓄電池',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unbilled: '未請求',
  billed: '請求済み',
  paid: '入金済み',
};

export const PAYMENT_STATUS_TONE: Record<string, BadgeTone> = {
  unbilled: 'neutral',
  billed: 'warning',
  paid: 'success',
};
