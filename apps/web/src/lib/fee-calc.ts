/**
 * 手数料計算ロジック — 仕様書 §4〜§6
 *
 * - fee_master を参照して kWh 区分から手数料額を決定
 * - 業務管理費（admin_fee, デフォルト2,000円税別）を差し引く
 * - 使用量未入力 / 確認不能の場合は最低基準（kwh_min=0 区分）にフォールバック
 *
 * Server-only (uses @looop/db). UI からは server actions / route handlers 経由で呼ぶ。
 */
import { db, feeMaster, and, eq, lte, gte, isNull, or, asc } from '@looop/db';

export interface FeeCalcInput {
  planCode: string;
  paymentMethod: string;
  /** 電気使用量(kWh)。null なら最低基準を適用 */
  usageKwh: number | null | undefined;
  /** 適用日（明細対象月の1日 など）。省略時は今日 */
  effectiveDate?: string;
}

export interface FeeCalcResult {
  feeAmount: number;
  adminFee: number;
  netFee: number;
  /** 最低基準が適用されたか */
  minimumApplied: boolean;
  /** マッチした fee_master 行 ID（監査用） */
  feeMasterId: string | null;
  /** マスター未ヒット時のメッセージ */
  warning?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 指定プラン・支払方法・適用日に有効な fee_master 行を、kWh 昇順で取得
 */
async function loadActiveTiers(
  planCode: string,
  paymentMethod: string,
  effectiveDate: string,
) {
  return db
    .select()
    .from(feeMaster)
    .where(
      and(
        eq(feeMaster.planCode, planCode),
        eq(feeMaster.paymentMethod, paymentMethod),
        lte(feeMaster.effectiveFrom, effectiveDate),
        or(isNull(feeMaster.effectiveTo), gte(feeMaster.effectiveTo, effectiveDate)),
      ),
    )
    .orderBy(asc(feeMaster.kwhMin));
}

export async function calculateFee(input: FeeCalcInput): Promise<FeeCalcResult> {
  const effectiveDate = input.effectiveDate ?? todayIso();
  const tiers = await loadActiveTiers(input.planCode, input.paymentMethod, effectiveDate);

  if (tiers.length === 0) {
    return {
      feeAmount: 0,
      adminFee: 0,
      netFee: 0,
      minimumApplied: false,
      feeMasterId: null,
      warning: '適用可能な手数料マスターが見つかりません',
    };
  }

  const usage = input.usageKwh;
  const hasUsage = typeof usage === 'number' && usage >= 0 && Number.isFinite(usage);

  // 最低基準: 仕様書 §6 — kwhMin=0 を含む最初の区分を最低基準とみなす
  const minimumTier = tiers[0]!;

  if (!hasUsage) {
    const adminFee = minimumTier.adminFee;
    return {
      feeAmount: minimumTier.feeAmount,
      adminFee,
      netFee: minimumTier.feeAmount - adminFee,
      minimumApplied: true,
      feeMasterId: minimumTier.id,
    };
  }

  // kWh 区分検索: kwhMin <= usage <= kwhMax (kwhMax=null なら ∞)
  const matched = tiers.find(
    (t) => usage >= t.kwhMin && (t.kwhMax === null || usage <= t.kwhMax),
  );

  if (!matched) {
    // 想定外: 最大区分を超えている場合は最大区分にフォールバック
    const maxTier = tiers[tiers.length - 1]!;
    const adminFee = maxTier.adminFee;
    return {
      feeAmount: maxTier.feeAmount,
      adminFee,
      netFee: maxTier.feeAmount - adminFee,
      minimumApplied: false,
      feeMasterId: maxTier.id,
      warning: 'kWh 区分が見つからず、最大区分で計算しました',
    };
  }

  const adminFee = matched.adminFee;
  return {
    feeAmount: matched.feeAmount,
    adminFee,
    netFee: matched.feeAmount - adminFee,
    minimumApplied: false,
    feeMasterId: matched.id,
  };
}

/**
 * UI プレビュー用: マスターの全区分を取得（編集画面 / 明細一覧で表示用）
 */
export async function getActiveFeeTiers(
  planCode: string,
  paymentMethod: string,
  effectiveDate?: string,
) {
  return loadActiveTiers(planCode, paymentMethod, effectiveDate ?? todayIso());
}

/**
 * 純粋関数版: マスター行を渡して計算（テスト/プレビュー用）
 */
export function calculateFeeFromTiers(
  tiers: Array<{ id: string; kwhMin: number; kwhMax: number | null; feeAmount: number; adminFee: number }>,
  usageKwh: number | null | undefined,
): FeeCalcResult {
  if (tiers.length === 0) {
    return { feeAmount: 0, adminFee: 0, netFee: 0, minimumApplied: false, feeMasterId: null, warning: 'マスター未設定' };
  }
  const sorted = [...tiers].sort((a, b) => a.kwhMin - b.kwhMin);
  const minimumTier = sorted[0]!;
  const usage = usageKwh;
  const hasUsage = typeof usage === 'number' && usage >= 0 && Number.isFinite(usage);

  if (!hasUsage) {
    return {
      feeAmount: minimumTier.feeAmount,
      adminFee: minimumTier.adminFee,
      netFee: minimumTier.feeAmount - minimumTier.adminFee,
      minimumApplied: true,
      feeMasterId: minimumTier.id,
    };
  }

  const matched = sorted.find((t) => usage >= t.kwhMin && (t.kwhMax === null || usage <= t.kwhMax));
  const tier = matched ?? sorted[sorted.length - 1]!;
  return {
    feeAmount: tier.feeAmount,
    adminFee: tier.adminFee,
    netFee: tier.feeAmount - tier.adminFee,
    minimumApplied: false,
    feeMasterId: tier.id,
    warning: matched ? undefined : 'kWh 区分が見つかりませんでした',
  };
}
