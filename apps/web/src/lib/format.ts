/** 電話番号の下4桁以外をマスク: "***-****-1234" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `***-****-${last4}`;
}

/** 金額フォーマット: 10000円未満は "9,999円"、10000円以上は "1万円" */
export function formatCurrency(yen: number): string {
  if (yen >= 10000) {
    const man = yen / 10000;
    const formatted = Number.isInteger(man)
      ? `${man}万円`
      : `${man.toFixed(1)}万円`;
    return formatted;
  }
  return `${yen.toLocaleString('ja-JP')}円`;
}

/** 日付フォーマット: "2026年5月8日" */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 年月フォーマット: "YYYY-MM" → "2026年5月" */
export function formatYearMonth(ym: string | null | undefined): string {
  if (!ym) return '—';
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  return `${year}年${parseInt(month, 10)}月`;
}
