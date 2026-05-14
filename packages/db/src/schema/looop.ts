import { date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';
import { leads } from './leads';

export const looopContracts = pgTable(
  'looop_contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    applicationId: text('application_id'),
    currentPowerCompany: text('current_power_company'),
    currentPlan: text('current_plan'),
    monthlyElectricBill: integer('monthly_electric_bill'),
    wattage: integer('wattage'),
    billUsageMonth: text('bill_usage_month'),
    // Looop プラン / 支払方法（仕様書 §2 申込管理）
    planCode: text('plan_code').notNull().default('smart_time_one_lighting'),
    paymentMethod: text('payment_method').notNull().default('bank_account'),
    supplyStartDate: date('supply_start_date'),
    terminationDate: date('termination_date'),
    memo: text('memo'),
    status: text('status').notNull().default('not_proposed'),
    applicationDate: date('application_date'),
    contractDate: date('contract_date'),
    openedDate: date('opened_date'),
    cancelDate: date('cancel_date'),
    cancelReason: text('cancel_reason'),
    unitPrice: integer('unit_price').notNull().default(30000),
    revenueMonth: text('revenue_month'),
    paymentStatus: text('payment_status').notNull().default('unbilled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('looop_status_idx').on(t.status),
    index('looop_revenue_month_idx').on(t.revenueMonth),
    index('looop_customer_idx').on(t.customerId),
  ],
);

export type LooopContractRow = typeof looopContracts.$inferSelect;
