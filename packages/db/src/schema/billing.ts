/**
 * 明細管理 / 手数料マスター / 返還管理 — 仕様書 §3〜§7
 *
 * - electricity_bills: 1顧客×1対象月の明細レコード
 * - fee_master: プラン×支払方法×kWh区分の手数料テーブル（適用期間付き）
 * - refunds: 手数料返還レコード（明細に対する負レコード）
 */
import { date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { looopContracts } from './looop';
import { users } from './users';

export const electricityBills = pgTable(
  'electricity_bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
    contractId: uuid('contract_id').references(() => looopContracts.id, { onDelete: 'set null' }),
    // 明細対象月 YYYY-MM
    billMonth: text('bill_month').notNull(),
    // 電気使用量(kWh) と 電気料金(円) — 未入力(null)なら最低基準扱い
    usageKwh: integer('usage_kwh'),
    electricFee: integer('electric_fee'),
    // 支払方法 / プラン (looop_payment_methods, looop_plan_codes)
    paymentMethod: text('payment_method').notNull(),
    planCode: text('plan_code').notNull().default('smart_time_one_lighting'),
    // 申込/契約/供給/入金（明細時点のスナップショット）
    applicationMonth: text('application_month'),
    contractMonth: text('contract_month'),
    supplyStartDate: date('supply_start_date'),
    expectedPaymentMonth: text('expected_payment_month'),
    paidAmount: integer('paid_amount'),
    // 計算結果（料率マスターから決定して保存）
    feeAmount: integer('fee_amount').notNull(),
    adminFee: integer('admin_fee').notNull().default(2000),
    netFee: integer('net_fee').notNull(),
    // 最低基準が適用されたかどうか（明細未提出/誤り など）
    minimumApplied: integer('minimum_applied').notNull().default(0),
    // 返還対象フラグ（明細単体で返還対象に印を付ける運用）
    refundFlagged: integer('refund_flagged').notNull().default(0),
    feeMasterId: uuid('fee_master_id'),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('electricity_bills_customer_idx').on(t.customerId),
    index('electricity_bills_month_idx').on(t.billMonth),
    uniqueIndex('electricity_bills_customer_month_uq').on(t.customerId, t.billMonth),
  ],
);

export const feeMaster = pgTable(
  'fee_master',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planCode: text('plan_code').notNull(),
    paymentMethod: text('payment_method').notNull(),
    // kWh下限（含む） / 上限（含む。null=∞）
    kwhMin: integer('kwh_min').notNull(),
    kwhMax: integer('kwh_max'),
    feeAmount: integer('fee_amount').notNull(),
    adminFee: integer('admin_fee').notNull().default(2000),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('fee_master_lookup_idx').on(t.planCode, t.paymentMethod, t.effectiveFrom),
  ],
);

export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
    contractId: uuid('contract_id').references(() => looopContracts.id, { onDelete: 'set null' }),
    billId: uuid('bill_id').references(() => electricityBills.id, { onDelete: 'set null' }),
    reasonCode: text('reason_code').notNull(),
    cancelDate: date('cancel_date'),
    terminationDate: date('termination_date'),
    supplyStartDate: date('supply_start_date'),
    refundMonth: text('refund_month'),
    refundAmount: integer('refund_amount').notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('refunds_customer_idx').on(t.customerId),
    index('refunds_month_idx').on(t.refundMonth),
  ],
);

export type ElectricityBillRow = typeof electricityBills.$inferSelect;
export type FeeMasterRow = typeof feeMaster.$inferSelect;
export type RefundRow = typeof refunds.$inferSelect;
