/**
 * SQLite schema — mirrors packages/db/src/schema/ but uses SQLite-compatible types.
 * Used for local development without an external Postgres instance.
 */
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Enums re-exported so callers can use the same constants
// ---------------------------------------------------------------------------
export * from '../schema/_enums';

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  externalUserId: text('external_user_id').unique(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  teamId: text('team_id'),
  status: text('status').notNull().default('active'),
  // 認証方式。'lark' = Lark SSO（社内）/ 'password' = メール+パスワード（外部・パートナー）
  authProvider: text('auth_provider').notNull().default('password'),
  // scrypt ハッシュ。'salt:hex' 形式。Lark ユーザーは null
  passwordHash: text('password_hash'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),
  leftAt: integer('left_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
  // Store scope as JSON text; e.g. '{"teamId":"xxx"}'
  scope: text('scope').default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
}));

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  managerId: text('manager_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------
export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventName: text('event_name').notNull(),
  venueName: text('venue_name'),
  venueAddress: text('venue_address'),
  eventDate: text('event_date'), // ISO date string YYYY-MM-DD
  area: text('area'),
  staffId: text('staff_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'),
  cost: integer('cost'),
  memo: text('memo'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// customers
// ---------------------------------------------------------------------------
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  displayId: text('display_id').notNull().unique(),
  name: text('name').notNull(),
  kana: text('kana'),
  // In local dev we store plain text (no actual AES-GCM encryption)
  phoneEnc: text('phone_enc').notNull(),
  phoneHash: text('phone_hash').notNull(),
  phoneSubEnc: text('phone_sub_enc'),
  emailEnc: text('email_enc'),
  birthDate: text('birth_date'),
  ageRange: text('age_range'),
  householdInfo: text('household_info'),
  preferredContactTime: text('preferred_contact_time'),
  currentMobileCarrier: text('current_mobile_carrier'),
  currentWifiCarrier: text('current_wifi_carrier'),
  memo: text('memo'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

export const customerAddresses = sqliteTable('customer_addresses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(true),
  postalCode: text('postal_code'),
  prefecture: text('prefecture'),
  city: text('city'),
  street: text('street'),
  building: text('building'),
  addressText: text('address_text'),
  googleFormattedAddress: text('google_formatted_address'),
  googleMapsUrl: text('google_maps_url'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  googlePlaceId: text('google_place_id'),
  pinConfirmed: integer('pin_confirmed', { mode: 'boolean' }).notNull().default(false),
  pinCorrected: integer('pin_corrected', { mode: 'boolean' }).notNull().default(false),
  pinCorrectionNote: text('pin_correction_note'),
  accuracyStatus: text('accuracy_status').notNull().default('unconfirmed'),
  residenceType: text('residence_type'),
  ownershipType: text('ownership_type'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// leads
// ---------------------------------------------------------------------------
export const leads = sqliteTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  eventId: text('event_id').references(() => events.id, { onDelete: 'set null' }),
  staffId: text('staff_id').references(() => users.id, { onDelete: 'set null' }),
  leadStatus: text('lead_status').notNull().default('new'),
  source: text('source'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// looop_contracts
// ---------------------------------------------------------------------------
export const looopContracts = sqliteTable('looop_contracts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  applicationId: text('application_id'),
  currentPowerCompany: text('current_power_company'),
  currentPlan: text('current_plan'),
  monthlyElectricBill: integer('monthly_electric_bill'),
  wattage: integer('wattage'),
  billUsageMonth: text('bill_usage_month'),
  planCode: text('plan_code').notNull().default('smart_time_one_lighting'),
  paymentMethod: text('payment_method').notNull().default('bank_account'),
  supplyStartDate: text('supply_start_date'),
  terminationDate: text('termination_date'),
  memo: text('memo'),
  status: text('status').notNull().default('applied'),
  applicationDate: text('application_date'),
  contractDate: text('contract_date'),
  openedDate: text('opened_date'),
  cancelDate: text('cancel_date'),
  cancelReason: text('cancel_reason'),
  unitPrice: integer('unit_price').notNull().default(30000),
  revenueMonth: text('revenue_month'),
  paymentStatus: text('payment_status').notNull().default('unbilled'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// electricity_bills (明細管理) — 仕様書 §3
// ---------------------------------------------------------------------------
export const electricityBills = sqliteTable('electricity_bills', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  contractId: text('contract_id').references(() => looopContracts.id, { onDelete: 'set null' }),
  billMonth: text('bill_month').notNull(),
  usageKwh: integer('usage_kwh'),
  electricFee: integer('electric_fee'),
  paymentMethod: text('payment_method').notNull(),
  planCode: text('plan_code').notNull().default('smart_time_one_lighting'),
  applicationMonth: text('application_month'),
  contractMonth: text('contract_month'),
  supplyStartDate: text('supply_start_date'),
  expectedPaymentMonth: text('expected_payment_month'),
  paidAmount: integer('paid_amount'),
  feeAmount: integer('fee_amount').notNull(),
  adminFee: integer('admin_fee').notNull().default(2000),
  netFee: integer('net_fee').notNull(),
  minimumApplied: integer('minimum_applied', { mode: 'boolean' }).notNull().default(false),
  refundFlagged: integer('refund_flagged', { mode: 'boolean' }).notNull().default(false),
  feeMasterId: text('fee_master_id'),
  note: text('note'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// fee_master (手数料マスター) — 仕様書 §4, §13
// ---------------------------------------------------------------------------
export const feeMaster = sqliteTable('fee_master', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  planCode: text('plan_code').notNull(),
  paymentMethod: text('payment_method').notNull(),
  kwhMin: integer('kwh_min').notNull(),
  kwhMax: integer('kwh_max'),
  feeAmount: integer('fee_amount').notNull(),
  adminFee: integer('admin_fee').notNull().default(2000),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// refunds (返還管理) — 仕様書 §7
// ---------------------------------------------------------------------------
export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  contractId: text('contract_id').references(() => looopContracts.id, { onDelete: 'set null' }),
  billId: text('bill_id').references(() => electricityBills.id, { onDelete: 'set null' }),
  reasonCode: text('reason_code').notNull(),
  cancelDate: text('cancel_date'),
  terminationDate: text('termination_date'),
  supplyStartDate: text('supply_start_date'),
  refundMonth: text('refund_month'),
  refundAmount: integer('refund_amount').notNull(),
  note: text('note'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// cross_sell_opportunities
// ---------------------------------------------------------------------------
export const crossSellOpportunities = sqliteTable('cross_sell_opportunities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  productType: text('product_type').notNull(),
  interestRank: text('interest_rank'),
  status: text('status').notNull().default('not_proposed'),
  nextActionDate: text('next_action_date'),
  expectedRevenue: integer('expected_revenue'),
  actualRevenue: integer('actual_revenue'),
  grossProfit: integer('gross_profit'),
  memo: text('memo'),
  // AI scoring (Phase 3)
  aiScore: text('ai_score'),
  aiScoreReason: text('ai_score_reason'),
  aiScoredAt: integer('ai_scored_at', { mode: 'timestamp' }),
  // Reminder tracking (Phase 2)
  lastReminderSentAt: integer('last_reminder_sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// consent_text_versions
// ---------------------------------------------------------------------------
export const consentTextVersions = sqliteTable('consent_text_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  version: text('version').notNull().unique(),
  consentType: text('consent_type').notNull(),
  body: text('body').notNull(),
  effectiveFrom: integer('effective_from', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// consents
// ---------------------------------------------------------------------------
export const consents = sqliteTable('consents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),
  consentStatus: text('consent_status').notNull(),
  consentTextVersion: text('consent_text_version').notNull(),
  consentedAt: integer('consented_at', { mode: 'timestamp' }).notNull(),
  consentedBy: text('consented_by').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  withdrawnAt: integer('withdrawn_at', { mode: 'timestamp' }),
  withdrawalReason: text('withdrawal_reason'),
  memo: text('memo'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// partner_companies
// ---------------------------------------------------------------------------
export const partnerCompanies = sqliteTable('partner_companies', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  productType: text('product_type').notNull(),
  contactEmail: text('contact_email'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// partner_handoffs
// ---------------------------------------------------------------------------
export const partnerHandoffs = sqliteTable('partner_handoffs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  partnerCompanyId: text('partner_company_id').references(() => partnerCompanies.id, { onDelete: 'set null' }),
  productType: text('product_type').notNull(),
  sharedItems: text('shared_items', { mode: 'json' }).$type<string[]>().notNull(),
  sharedAt: integer('shared_at', { mode: 'timestamp' }).notNull(),
  sharedBy: text('shared_by').references(() => users.id, { onDelete: 'set null' }),
  handoffStatus: text('handoff_status').notNull().default('handed_off'),
  csvExportId: text('csv_export_id'),
  partnerResult: text('partner_result'),
  memo: text('memo'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// activities
// ---------------------------------------------------------------------------
export const activities = sqliteTable('activities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').references(() => users.id, { onDelete: 'set null' }),
  activityType: text('activity_type').notNull(),
  content: text('content'),
  nextActionDate: text('next_action_date'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// files
// ---------------------------------------------------------------------------
export const files = sqliteTable('files', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  fileType: text('file_type').notNull(),
  blobUrl: text('blob_url').notNull(),
  blobPathname: text('blob_pathname'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// audit_logs  (bigserial → autoincrement integer)
// ---------------------------------------------------------------------------
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  diff: text('diff', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// csv_exports
// ---------------------------------------------------------------------------
export const csvExports = sqliteTable('csv_exports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  exporterUserId: text('exporter_user_id').references(() => users.id, { onDelete: 'set null' }),
  exportedAt: integer('exported_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  targetPartnerId: text('target_partner_id').references(() => partnerCompanies.id, { onDelete: 'set null' }),
  recordCount: integer('record_count').notNull(),
  customerIds: text('customer_ids', { mode: 'json' }).$type<string[]>().notNull(),
  filterSnapshot: text('filter_snapshot', { mode: 'json' }),
  fileBlobUrl: text('file_blob_url'),
  reason: text('reason'),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type UserRow = typeof users.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type CustomerAddressRow = typeof customerAddresses.$inferSelect;
export type LeadRow = typeof leads.$inferSelect;
export type LooopContractRow = typeof looopContracts.$inferSelect;
export type ElectricityBillRow = typeof electricityBills.$inferSelect;
export type FeeMasterRow = typeof feeMaster.$inferSelect;
export type RefundRow = typeof refunds.$inferSelect;
export type CrossSellRow = typeof crossSellOpportunities.$inferSelect;
export type ConsentRow = typeof consents.$inferSelect;
export type PartnerCompanyRow = typeof partnerCompanies.$inferSelect;
export type PartnerHandoffRow = typeof partnerHandoffs.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type CsvExportRow = typeof csvExports.$inferSelect;
