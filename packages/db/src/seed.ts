/**
 * Seed script for local SQLite development database.
 * Idempotent: uses INSERT OR IGNORE / INSERT OR REPLACE where appropriate.
 * Also runs schema push (CREATE TABLE IF NOT EXISTS) before inserting.
 */
import Database from 'better-sqlite3';
import { getSqliteDb } from './client-sqlite';
import {
  users,
  roles,
  userRoles,
  events,
  customers,
  customerAddresses,
  leads,
  looopContracts,
  crossSellOpportunities,
  consentTextVersions,
  consents,
  partnerCompanies,
  activities,
} from './schema-lite';
import { sql } from 'drizzle-orm';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

function addColumnIfMissing(
  sqlite: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = sqlite
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function createTables() {
  const url = process.env.DATABASE_URL ?? 'file:.local-db/looop.db';
  const filePath = url.replace(/^file:/, '');
  mkdirSync(dirname(filePath), { recursive: true });
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = OFF'); // off during schema creation

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      manager_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      external_user_id TEXT UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      team_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      joined_at INTEGER,
      left_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
      scope TEXT DEFAULT '{}',
      created_at INTEGER,
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_name TEXT NOT NULL,
      venue_name TEXT,
      venue_address TEXT,
      event_date TEXT,
      area TEXT,
      staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active',
      cost INTEGER,
      memo TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      display_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      kana TEXT,
      phone_enc TEXT NOT NULL,
      phone_hash TEXT NOT NULL,
      phone_sub_enc TEXT,
      email_enc TEXT,
      birth_date TEXT,
      age_range TEXT,
      household_info TEXT,
      preferred_contact_time TEXT,
      memo TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      is_primary INTEGER NOT NULL DEFAULT 1,
      postal_code TEXT,
      prefecture TEXT,
      city TEXT,
      street TEXT,
      building TEXT,
      address_text TEXT,
      google_formatted_address TEXT,
      google_maps_url TEXT,
      latitude REAL,
      longitude REAL,
      google_place_id TEXT,
      pin_confirmed INTEGER NOT NULL DEFAULT 0,
      pin_corrected INTEGER NOT NULL DEFAULT 0,
      pin_correction_note TEXT,
      accuracy_status TEXT NOT NULL DEFAULT 'unconfirmed',
      residence_type TEXT,
      ownership_type TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
      staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      lead_status TEXT NOT NULL DEFAULT 'new',
      source TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS looop_contracts (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
      application_id TEXT,
      current_power_company TEXT,
      current_plan TEXT,
      monthly_electric_bill INTEGER,
      wattage INTEGER,
      bill_usage_month TEXT,
      status TEXT NOT NULL DEFAULT 'not_proposed',
      application_date TEXT,
      contract_date TEXT,
      opened_date TEXT,
      cancel_date TEXT,
      cancel_reason TEXT,
      unit_price INTEGER NOT NULL DEFAULT 30000,
      revenue_month TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unbilled',
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cross_sell_opportunities (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_type TEXT NOT NULL,
      interest_rank TEXT,
      status TEXT NOT NULL DEFAULT 'not_proposed',
      next_action_date TEXT,
      expected_revenue INTEGER,
      actual_revenue INTEGER,
      gross_profit INTEGER,
      memo TEXT,
      ai_score TEXT,
      ai_score_reason TEXT,
      ai_scored_at INTEGER,
      last_reminder_sent_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS consent_text_versions (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL UNIQUE,
      consent_type TEXT NOT NULL,
      body TEXT NOT NULL,
      effective_from INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      consent_status TEXT NOT NULL,
      consent_text_version TEXT NOT NULL,
      consented_at INTEGER NOT NULL,
      consented_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      ip_address TEXT,
      user_agent TEXT,
      withdrawn_at INTEGER,
      withdrawal_reason TEXT,
      memo TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS partner_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      product_type TEXT NOT NULL,
      contact_email TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS partner_handoffs (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      partner_company_id TEXT REFERENCES partner_companies(id) ON DELETE SET NULL,
      product_type TEXT NOT NULL,
      shared_items TEXT NOT NULL,
      shared_at INTEGER NOT NULL,
      shared_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      handoff_status TEXT NOT NULL DEFAULT 'handed_off',
      csv_export_id TEXT,
      partner_result TEXT,
      memo TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      activity_type TEXT NOT NULL,
      content TEXT,
      next_action_date TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      file_type TEXT NOT NULL,
      blob_url TEXT NOT NULL,
      blob_pathname TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      uploaded_at INTEGER,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      diff TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS csv_exports (
      id TEXT PRIMARY KEY,
      exporter_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      exported_at INTEGER,
      target_partner_id TEXT REFERENCES partner_companies(id) ON DELETE SET NULL,
      record_count INTEGER NOT NULL,
      customer_ids TEXT NOT NULL,
      filter_snapshot TEXT,
      file_blob_url TEXT,
      reason TEXT
    );
  `);

  addColumnIfMissing(sqlite, 'customers', 'birth_date', 'TEXT');
  addColumnIfMissing(sqlite, 'events', 'staff_id', 'TEXT');
  addColumnIfMissing(sqlite, 'events', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing(sqlite, 'looop_contracts', 'wattage', 'INTEGER');
  addColumnIfMissing(sqlite, 'looop_contracts', 'bill_usage_month', 'TEXT');
  addColumnIfMissing(sqlite, 'cross_sell_opportunities', 'ai_score', 'TEXT');
  addColumnIfMissing(sqlite, 'cross_sell_opportunities', 'ai_score_reason', 'TEXT');
  addColumnIfMissing(sqlite, 'cross_sell_opportunities', 'ai_scored_at', 'INTEGER');
  addColumnIfMissing(sqlite, 'cross_sell_opportunities', 'last_reminder_sent_at', 'INTEGER');

  sqlite.pragma('foreign_keys = ON');
  sqlite.close();
}

export async function seed() {
  // Create tables first (idempotent)
  createTables();

  const db = getSqliteDb();

  console.log('🌱 Seeding local SQLite database…');

  // ---------------------------------------------------------------------------
  // Roles (6)
  // ---------------------------------------------------------------------------
  const roleData = [
    { id: 'role-admin',   code: 'admin',   name: '管理者' },
    { id: 'role-manager', code: 'manager', name: 'マネージャー' },
    { id: 'role-field',   code: 'field',   name: 'フィールドスタッフ' },
    { id: 'role-cs',      code: 'cs',      name: 'カスタマーサポート' },
    { id: 'role-finance', code: 'finance', name: '経理' },
    { id: 'role-partner', code: 'partner', name: 'パートナー' },
  ];

  for (const r of roleData) {
    db.run(
      sql`INSERT OR IGNORE INTO roles (id, code, name, created_at)
          VALUES (${r.id}, ${r.code}, ${r.name}, ${Math.floor(Date.now() / 1000)})`
    );
  }
  console.log('  ✓ roles');

  // ---------------------------------------------------------------------------
  // Events (催事会場) (5)
  // ---------------------------------------------------------------------------
  const eventData = [
    { id: 'evt-001', eventName: 'イオンモール幕張新都心 催事', venueName: 'イオンモール幕張新都心', venueAddress: '千葉県千葉市花見川区', eventDate: '2026-06-01', area: '関東', staffId: 'user-003', status: 'active' },
    { id: 'evt-002', eventName: 'ビバホーム長津田店 催事',    venueName: 'ビバホーム長津田店',    venueAddress: '神奈川県横浜市緑区',      eventDate: '2026-06-08', area: '関東', staffId: 'user-004', status: 'active' },
    { id: 'evt-003', eventName: 'コーナン東大阪店 催事',      venueName: 'コーナン東大阪店',      venueAddress: '大阪府東大阪市',          eventDate: '2026-06-15', area: '関西', staffId: 'user-003', status: 'scheduled' },
    { id: 'evt-004', eventName: 'カインズホーム熊谷店 催事',  venueName: 'カインズホーム熊谷店',  venueAddress: '埼玉県熊谷市',            eventDate: '2026-06-22', area: '関東', staffId: 'user-004', status: 'scheduled' },
    { id: 'evt-005', eventName: 'DCM仙台泉店 催事',           venueName: 'DCM仙台泉店',           venueAddress: '宮城県仙台市',            eventDate: '2026-06-29', area: '東北', staffId: 'user-003', status: 'scheduled' },
  ];

  const now = Math.floor(Date.now() / 1000);
  for (const e of eventData) {
    db.run(
      sql`INSERT OR IGNORE INTO events
            (id, event_name, venue_name, venue_address, event_date, area, staff_id, status, created_at, updated_at)
          VALUES
            (${e.id}, ${e.eventName}, ${e.venueName}, ${e.venueAddress}, ${e.eventDate}, ${e.area}, ${null}, ${e.status}, ${now}, ${now})`
    );
  }
  console.log('  ✓ events');

  // ---------------------------------------------------------------------------
  // Partner companies (3)
  // ---------------------------------------------------------------------------
  const partnerData = [
    { id: 'partner-001', name: '株式会社サンパワー',   productType: 'solar',   contactEmail: 'info@sunpower.example.jp' },
    { id: 'partner-002', name: 'エコ電力株式会社',     productType: 'solar',   contactEmail: 'info@ecopower.example.jp' },
    { id: 'partner-003', name: 'バッテリーテック株式会社', productType: 'battery', contactEmail: 'info@batterytech.example.jp' },
  ];

  for (const p of partnerData) {
    db.run(
      sql`INSERT OR IGNORE INTO partner_companies
            (id, name, product_type, contact_email, active, created_at, updated_at)
          VALUES (${p.id}, ${p.name}, ${p.productType}, ${p.contactEmail}, 1, ${now}, ${now})`
    );
  }
  console.log('  ✓ partner_companies');

  // ---------------------------------------------------------------------------
  // Staff users (5)
  // ---------------------------------------------------------------------------
  const staffData = [
    { id: 'user-001', externalUserId: 'stub:dev-user', displayName: '田中太郎',   email: 'tanaka@looop-crm.local',  roleId: 'role-admin'   },
    { id: 'user-002', externalUserId: null,             displayName: '鈴木花子',   email: 'suzuki@looop-crm.local',  roleId: 'role-manager' },
    { id: 'user-003', externalUserId: null,             displayName: '山田次郎',   email: 'yamada@looop-crm.local',  roleId: 'role-field'   },
    { id: 'user-004', externalUserId: null,             displayName: '佐藤三郎',   email: 'sato@looop-crm.local',    roleId: 'role-field'   },
    { id: 'user-005', externalUserId: null,             displayName: '高橋美咲',   email: 'takahashi@looop-crm.local', roleId: 'role-cs'   },
  ];

  for (const u of staffData) {
    db.run(
      sql`INSERT OR IGNORE INTO users
            (id, external_user_id, display_name, email, status, created_at, updated_at)
          VALUES (${u.id}, ${u.externalUserId}, ${u.displayName}, ${u.email}, 'active', ${now}, ${now})`
    );
    db.run(
      sql`INSERT OR IGNORE INTO user_roles (user_id, role_id, scope, created_at)
          VALUES (${u.id}, ${u.roleId}, '{}', ${now})`
    );
  }
  console.log('  ✓ users + user_roles');

  for (const e of eventData) {
    db.run(
      sql`UPDATE events
          SET staff_id = ${e.staffId}, status = ${e.status}, updated_at = ${now}
          WHERE id = ${e.id}`
    );
  }

  // ---------------------------------------------------------------------------
  // Consent text versions
  // ---------------------------------------------------------------------------
  const consentVersions = [
    {
      id: 'ctv-personal-v1',
      version: 'v1.0',
      consentType: 'personal_info_use',
      body: '当社は、お客様の個人情報を電力サービスのご提案、関連サービスの提供、太陽光発電・蓄電池等のご案内および提携先への情報提供のために利用いたします。',
    },
    {
      id: 'ctv-combined-v2',
      version: 'v2.0-combined',
      consentType: 'combined_personal_solar',
      body: '当社は、お客様の個人情報を電力サービスのご提案、関連サービスの提供、太陽光発電・蓄電池等のご案内および提携先への情報提供のために利用いたします。',
    },
    {
      id: 'ctv-solar-v1',
      version: 'v1.0-solar',
      consentType: 'solar_partner_share',
      body: 'お客様の同意のもと、太陽光発電の導入検討のためにパートナー企業へお客様情報を提供いたします。',
    },
  ];

  for (const cv of consentVersions) {
    db.run(
      sql`INSERT OR IGNORE INTO consent_text_versions
            (id, version, consent_type, body, effective_from, created_at)
          VALUES (${cv.id}, ${cv.version}, ${cv.consentType}, ${cv.body}, ${now}, ${now})`
    );
  }
  console.log('  ✓ consent_text_versions');

  // ---------------------------------------------------------------------------
  // Customers (10) with addresses and various statuses
  // ---------------------------------------------------------------------------
  type CustomerSeed = {
    id: string;
    displayId: string;
    name: string;
    kana: string;
    phone: string;
    email: string;
    ageRange: string;
    householdInfo: string;
    createdBy: string;
    looopStatus: string;
    eventId: string;
    staffId: string;
    hasSolarConsent: boolean;
    prefecture: string;
    city: string;
    street: string;
    postalCode: string;
  };

  const customerSeedData: CustomerSeed[] = [
    { id: 'cust-001', displayId: 'C-00001', name: '青木一郎',   kana: 'アオキイチロウ',   phone: '090-1234-5601', email: 'aoki@example.com',     ageRange: '50s', householdInfo: '4人家族', createdBy: 'user-003', looopStatus: 'contracted', eventId: 'evt-001', staffId: 'user-003', hasSolarConsent: true,  prefecture: '千葉県', city: '千葉市花見川区', street: '幕張1-1-1', postalCode: '262-0032' },
    { id: 'cust-002', displayId: 'C-00002', name: '伊藤恵子',   kana: 'イトウケイコ',     phone: '090-1234-5602', email: 'ito@example.com',      ageRange: '40s', householdInfo: '3人家族', createdBy: 'user-003', looopStatus: 'applied',    eventId: 'evt-001', staffId: 'user-003', hasSolarConsent: true,  prefecture: '千葉県', city: '千葉市中央区', street: '中央2-5-10', postalCode: '260-0013' },
    { id: 'cust-003', displayId: 'C-00003', name: '上田誠',     kana: 'ウエダマコト',     phone: '090-1234-5603', email: 'ueda@example.com',     ageRange: '60s', householdInfo: '2人家族', createdBy: 'user-004', looopStatus: 'interested', eventId: 'evt-002', staffId: 'user-004', hasSolarConsent: false, prefecture: '神奈川県', city: '横浜市緑区', street: '長津田3-2-8', postalCode: '226-0027' },
    { id: 'cust-004', displayId: 'C-00004', name: '遠藤幸子',   kana: 'エンドウサチコ',   phone: '090-1234-5604', email: 'endo@example.com',     ageRange: '30s', householdInfo: '5人家族', createdBy: 'user-004', looopStatus: 'proposed',   eventId: 'evt-002', staffId: 'user-004', hasSolarConsent: false, prefecture: '神奈川県', city: '横浜市青葉区', street: '青葉台4-3-2', postalCode: '227-0062' },
    { id: 'cust-005', displayId: 'C-00005', name: '加藤健太',   kana: 'カトウケンタ',     phone: '090-1234-5605', email: 'kato@example.com',     ageRange: '40s', householdInfo: '4人家族', createdBy: 'user-003', looopStatus: 'opened',     eventId: 'evt-003', staffId: 'user-003', hasSolarConsent: true,  prefecture: '大阪府', city: '東大阪市', street: '高井田5-10-3', postalCode: '578-0941' },
    { id: 'cust-006', displayId: 'C-00006', name: '木村奈緒',   kana: 'キムラナオ',       phone: '090-1234-5606', email: 'kimura@example.com',   ageRange: '50s', householdInfo: '2人家族', createdBy: 'user-004', looopStatus: 'not_proposed', eventId: 'evt-003', staffId: 'user-004', hasSolarConsent: false, prefecture: '大阪府', city: '大阪市旭区', street: '大宮6-4-1', postalCode: '535-0021' },
    { id: 'cust-007', displayId: 'C-00007', name: '桑原隆',     kana: 'クワハラタカシ',   phone: '090-1234-5607', email: 'kuwahara@example.com', ageRange: '60s', householdInfo: '1人暮らし', createdBy: 'user-003', looopStatus: 'cancelled', eventId: 'evt-004', staffId: 'user-003', hasSolarConsent: false, prefecture: '埼玉県', city: '熊谷市', street: '石原7-1-5', postalCode: '360-0042' },
    { id: 'cust-008', displayId: 'C-00008', name: '小林正美',   kana: 'コバヤシマサミ',   phone: '090-1234-5608', email: 'kobayashi@example.com',ageRange: '40s', householdInfo: '3人家族', createdBy: 'user-004', looopStatus: 'under_review', eventId: 'evt-004', staffId: 'user-004', hasSolarConsent: true,  prefecture: '埼玉県', city: '行田市', street: '本町8-2-10', postalCode: '361-0052' },
    { id: 'cust-009', displayId: 'C-00009', name: '斎藤まり',   kana: 'サイトウマリ',     phone: '090-1234-5609', email: 'saito@example.com',    ageRange: '30s', householdInfo: '4人家族', createdBy: 'user-003', looopStatus: 'contracted', eventId: 'evt-005', staffId: 'user-003', hasSolarConsent: true,  prefecture: '宮城県', city: '仙台市泉区', street: '泉中央9-5-3', postalCode: '981-3133' },
    { id: 'cust-010', displayId: 'C-00010', name: '坂本雄介',   kana: 'サカモトユウスケ', phone: '090-1234-5610', email: 'sakamoto@example.com', ageRange: '50s', householdInfo: '2人家族', createdBy: 'user-004', looopStatus: 'interested', eventId: 'evt-005', staffId: 'user-004', hasSolarConsent: false, prefecture: '宮城県', city: '仙台市青葉区', street: '青葉10-1-1', postalCode: '980-0011' },
  ];

  for (const c of customerSeedData) {
    // customer
    db.run(
      sql`INSERT OR IGNORE INTO customers
            (id, display_id, name, kana, phone_enc, phone_hash, email_enc, age_range, household_info, created_by, created_at, updated_at)
          VALUES
            (${c.id}, ${c.displayId}, ${c.name}, ${c.kana},
             ${c.phone}, ${c.phone},
             ${c.email},
             ${c.ageRange}, ${c.householdInfo}, ${c.createdBy}, ${now}, ${now})`
    );

    // address
    const addrId = `addr-${c.id}`;
    db.run(
      sql`INSERT OR IGNORE INTO customer_addresses
            (id, customer_id, is_primary, postal_code, prefecture, city, street, accuracy_status, created_at, updated_at)
          VALUES
            (${addrId}, ${c.id}, 1, ${c.postalCode}, ${c.prefecture}, ${c.city}, ${c.street}, 'unconfirmed', ${now}, ${now})`
    );

    // lead
    const leadId = `lead-${c.id}`;
    db.run(
      sql`INSERT OR IGNORE INTO leads
            (id, customer_id, event_id, staff_id, lead_status, source, created_at)
          VALUES
            (${leadId}, ${c.id}, ${c.eventId}, ${c.staffId}, 'new', 'event', ${now})`
    );

    // looop contract
    const contractId = `lc-${c.id}`;
    db.run(
      sql`INSERT OR IGNORE INTO looop_contracts
            (id, customer_id, lead_id, status, unit_price, payment_status, created_at, updated_at)
          VALUES
            (${contractId}, ${c.id}, ${leadId}, ${c.looopStatus}, 30000, 'unbilled', ${now}, ${now})`
    );

    // solar cross-sell opportunity
    const xsId = `xs-${c.id}`;
    const xsStatus = c.hasSolarConsent ? 'interested' : 'not_proposed';
    db.run(
      sql`INSERT OR IGNORE INTO cross_sell_opportunities
            (id, customer_id, product_type, status, created_at, updated_at)
          VALUES
            (${xsId}, ${c.id}, 'solar', ${xsStatus}, ${now}, ${now})`
    );

    // personal_info_use consent for everyone
    const consentId = `consent-piu-${c.id}`;
    db.run(
      sql`INSERT OR IGNORE INTO consents
            (id, customer_id, consent_type, consent_status, consent_text_version, consented_at, consented_by, created_at)
          VALUES
            (${consentId}, ${c.id}, 'personal_info_use', 'granted', 'v1.0', ${now}, ${c.staffId}, ${now})`
    );

    // solar consent for some customers
    if (c.hasSolarConsent) {
      const solarConsentId = `consent-solar-${c.id}`;
      db.run(
        sql`INSERT OR IGNORE INTO consents
              (id, customer_id, consent_type, consent_status, consent_text_version, consented_at, consented_by, created_at)
            VALUES
              (${solarConsentId}, ${c.id}, 'solar_partner_share', 'granted', 'v1.0-solar', ${now}, ${c.staffId}, ${now})`
      );
    }

    // sample activity
    const actId = `act-${c.id}`;
    db.run(
      sql`INSERT OR IGNORE INTO activities
            (id, customer_id, staff_id, activity_type, content, created_at)
          VALUES
            (${actId}, ${c.id}, ${c.staffId}, 'memo', '催事にて接客。電力プランに興味あり。', ${now})`
    );
  }

  console.log('  ✓ customers (10) with addresses, leads, contracts, cross-sell, consents, activities');
  console.log('');
  console.log('✅ Seed complete!');
}
