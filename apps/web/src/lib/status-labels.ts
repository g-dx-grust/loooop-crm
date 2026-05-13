import type { BadgeTone } from '@/components/ui/badge';

export const LOOOP_STATUS_LABELS: Record<string, string> = {
  not_proposed: '未提案',
  proposed: '提案済み',
  interested: '興味あり',
  applied: '申込済み',
  under_review: '審査中',
  contracted: '契約完了',
  opened: '開通完了',
  cancelled: 'キャンセル',
  excluded: '対象外',
};

export const LOOOP_STATUS_TONE: Record<string, BadgeTone> = {
  not_proposed: 'neutral',
  excluded:     'neutral',
  proposed:     'warning',
  interested:   'warning',
  applied:      'info',
  under_review: 'info',
  contracted:   'success',
  opened:       'success',
  cancelled:    'error',
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
