import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// PostgreSQL の bytea 型を扱うカスタム型
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType: () => 'bytea',
});

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayId: text('display_id').notNull().unique(),
    name: text('name').notNull(),
    kana: text('kana'),
    // 暗号化列（アプリ層でAES-GCM）
    phoneEnc: bytea('phone_enc').notNull(),
    // 重複チェック・検索用ハッシュ（HMAC SHA-256, pepper付き）
    phoneHash: bytea('phone_hash').notNull(),
    phoneSubEnc: bytea('phone_sub_enc'),
    emailEnc: bytea('email_enc'),
    birthDate: date('birth_date'),
    ageRange: text('age_range'),
    householdInfo: text('household_info'),
    preferredContactTime: text('preferred_contact_time'),
    memo: text('memo'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // 論理削除済みは除外する partial unique index
    uniqueIndex('customers_phone_hash_active_uq')
      .on(t.phoneHash)
      .where(sql`${t.deletedAt} IS NULL`),
    index('customers_name_idx').on(t.name),
    index('customers_created_at_idx').on(t.createdAt),
  ],
);

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(true),
    postalCode: text('postal_code'),
    prefecture: text('prefecture'),
    city: text('city'),
    street: text('street'),
    building: text('building'),
    addressText: text('address_text'),
    googleFormattedAddress: text('google_formatted_address'),
    googleMapsUrl: text('google_maps_url'),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    googlePlaceId: text('google_place_id'),
    pinConfirmed: boolean('pin_confirmed').notNull().default(false),
    pinCorrected: boolean('pin_corrected').notNull().default(false),
    pinCorrectionNote: text('pin_correction_note'),
    accuracyStatus: text('accuracy_status').notNull().default('unconfirmed'),
    residenceType: text('residence_type'),
    ownershipType: text('ownership_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('customer_addresses_customer_idx').on(t.customerId)],
);

export type CustomerRow = typeof customers.$inferSelect;
export type CustomerAddressRow = typeof customerAddresses.$inferSelect;
