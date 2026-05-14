/**
 * Seed script for Supabase (Postgres) development database.
 * 冪等: PK / unique 制約を持つ列に対して ON CONFLICT DO NOTHING を使用。
 * テーブル作成は drizzle migrations 側に任せる（事前に `pnpm --filter @looop/db migrate` を流すこと）。
 *
 * 既定パスワード: Looop2026!  （seed 直後にログイン可能にするためのデモ用）
 * メール+パスワードでログインできるユーザー:
 *   - staff.a@partner.example.jp   (field)
 *   - partner.a@sunpower.example.jp (partner)
 */
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';

// drizzle-kit と同じく packages/db/.env を自動ロード
function loadEnvFile(file: string) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2] ?? '';
  }
}
loadEnvFile('.env');

import { getPgDb } from './client-postgres';

/** 決定論的 UUID v5 風: 同じ name から常に同じ UUID を生成。 */
function uid(name: string): string {
  const hex = createHash('sha1').update('looop-seed:' + name).digest('hex');
  const y = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${y}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function hashPasswordForSeed(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export async function seed() {
  const db = getPgDb();
  console.log('🌱 Seeding Supabase (Postgres) database…');

  // ---------------------------------------------------------------------------
  // Roles
  // ---------------------------------------------------------------------------
  const roleData = [
    { id: uid('role-admin'),   code: 'admin',   name: '管理者' },
    { id: uid('role-manager'), code: 'manager', name: 'マネージャー' },
    { id: uid('role-field'),   code: 'field',   name: 'フィールドスタッフ' },
    { id: uid('role-cs'),      code: 'cs',      name: 'カスタマーサポート' },
    { id: uid('role-finance'), code: 'finance', name: '経理' },
    { id: uid('role-partner'), code: 'partner', name: 'パートナー' },
  ];

  for (const r of roleData) {
    await db.execute(sql`
      INSERT INTO roles (id, code, name)
      VALUES (${r.id}::uuid, ${r.code}, ${r.name})
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ roles');

  // ---------------------------------------------------------------------------
  // Staff users
  // ---------------------------------------------------------------------------
  const seedPassword = hashPasswordForSeed('Looop2026!');
  const staffData = [
    { id: uid('user-001'), externalUserId: 'lark:tanaka-001',    displayName: '田中太郎',       email: 'tanaka@n-grust.co.jp',         roleId: uid('role-admin'),   authProvider: 'lark',     passwordHash: null as string | null },
    { id: uid('user-002'), externalUserId: 'lark:suzuki-002',    displayName: '鈴木花子',       email: 'suzuki@n-grust.co.jp',         roleId: uid('role-manager'), authProvider: 'lark',     passwordHash: null },
    { id: uid('user-003'), externalUserId: 'lark:yamada-003',    displayName: '山田次郎',       email: 'yamada@n-grust.co.jp',         roleId: uid('role-field'),   authProvider: 'lark',     passwordHash: null },
    { id: uid('user-004'), externalUserId: 'lark:sato-004',      displayName: '佐藤三郎',       email: 'sato@n-grust.co.jp',           roleId: uid('role-field'),   authProvider: 'lark',     passwordHash: null },
    { id: uid('user-005'), externalUserId: 'lark:takahashi-005', displayName: '高橋美咲',       email: 'takahashi@n-grust.co.jp',      roleId: uid('role-cs'),      authProvider: 'lark',     passwordHash: null },
    { id: uid('user-006'), externalUserId: null,                  displayName: '外部スタッフ A', email: 'staff.a@partner.example.jp',    roleId: uid('role-field'),   authProvider: 'password', passwordHash: seedPassword },
    { id: uid('user-007'), externalUserId: null,                  displayName: 'パートナー連携A', email: 'partner.a@sunpower.example.jp',  roleId: uid('role-partner'), authProvider: 'password', passwordHash: seedPassword },
    { id: uid('user-008'), externalUserId: 'lark:kawaguchi-008',  displayName: '川口凌',         email: 'kawaguchi@n-grust.co.jp',        roleId: uid('role-manager'), authProvider: 'lark',     passwordHash: seedPassword },
  ];

  for (const u of staffData) {
    await db.execute(sql`
      INSERT INTO users (id, external_user_id, display_name, email, status, auth_provider, password_hash)
      VALUES (${u.id}::uuid, ${u.externalUserId}, ${u.displayName}, ${u.email}, 'active', ${u.authProvider}, ${u.passwordHash})
      ON CONFLICT (id) DO UPDATE
        SET external_user_id = EXCLUDED.external_user_id,
            display_name     = EXCLUDED.display_name,
            email            = EXCLUDED.email,
            auth_provider    = EXCLUDED.auth_provider,
            password_hash    = EXCLUDED.password_hash
    `);
    await db.execute(sql`
      INSERT INTO user_roles (user_id, role_id, scope)
      VALUES (${u.id}::uuid, ${u.roleId}::uuid, '{}'::jsonb)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);
  }
  console.log('  ✓ users + user_roles');
  console.log('     Lark ユーザー: tanaka@n-grust.co.jp (admin) / suzuki@n-grust.co.jp (manager) / kawaguchi@n-grust.co.jp (manager) など');
  console.log('     パスワードログイン: staff.a@partner.example.jp / partner.a@sunpower.example.jp / kawaguchi@n-grust.co.jp (パスワード: Looop2026!)');

  // ---------------------------------------------------------------------------
  // Events (催事会場)
  // ---------------------------------------------------------------------------
  const eventData = [
    { id: uid('evt-001'), eventName: 'イオンモール幕張新都心 催事', venueName: 'イオンモール幕張新都心', venueAddress: '千葉県千葉市花見川区', eventDate: '2026-06-01', area: '関東', staffId: uid('user-003'), status: 'active' },
    { id: uid('evt-002'), eventName: 'ビバホーム長津田店 催事',     venueName: 'ビバホーム長津田店',     venueAddress: '神奈川県横浜市緑区',   eventDate: '2026-06-08', area: '関東', staffId: uid('user-004'), status: 'active' },
    { id: uid('evt-003'), eventName: 'コーナン東大阪店 催事',       venueName: 'コーナン東大阪店',       venueAddress: '大阪府東大阪市',       eventDate: '2026-06-15', area: '関西', staffId: uid('user-003'), status: 'scheduled' },
    { id: uid('evt-004'), eventName: 'カインズホーム熊谷店 催事',   venueName: 'カインズホーム熊谷店',   venueAddress: '埼玉県熊谷市',         eventDate: '2026-06-22', area: '関東', staffId: uid('user-004'), status: 'scheduled' },
    { id: uid('evt-005'), eventName: 'DCM仙台泉店 催事',            venueName: 'DCM仙台泉店',            venueAddress: '宮城県仙台市',         eventDate: '2026-06-29', area: '東北', staffId: uid('user-003'), status: 'scheduled' },
  ];

  for (const e of eventData) {
    await db.execute(sql`
      INSERT INTO events (id, event_name, venue_name, venue_address, event_date, area, staff_id, status)
      VALUES (${e.id}::uuid, ${e.eventName}, ${e.venueName}, ${e.venueAddress}, ${e.eventDate}::date, ${e.area}, ${e.staffId}::uuid, ${e.status})
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ events');

  // ---------------------------------------------------------------------------
  // Partner companies
  // ---------------------------------------------------------------------------
  const partnerData = [
    { id: uid('partner-001'), name: '株式会社サンパワー',         productType: 'solar',   contactEmail: 'info@sunpower.example.jp' },
    { id: uid('partner-002'), name: 'エコ電力株式会社',           productType: 'solar',   contactEmail: 'info@ecopower.example.jp' },
    { id: uid('partner-003'), name: 'バッテリーテック株式会社',   productType: 'battery', contactEmail: 'info@batterytech.example.jp' },
  ];

  for (const p of partnerData) {
    await db.execute(sql`
      INSERT INTO partner_companies (id, name, product_type, contact_email, active)
      VALUES (${p.id}::uuid, ${p.name}, ${p.productType}, ${p.contactEmail}, true)
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ partner_companies');

  // ---------------------------------------------------------------------------
  // Fee master (手数料マスター)
  // ---------------------------------------------------------------------------
  const feeMasterData = [
    { id: uid('fee-bank-001'),  plan: 'smart_time_one_lighting', method: 'bank_account', min:    0, max:  199 as number | null, fee:  3000 },
    { id: uid('fee-bank-002'),  plan: 'smart_time_one_lighting', method: 'bank_account', min:  200, max:  499, fee: 10000 },
    { id: uid('fee-bank-003'),  plan: 'smart_time_one_lighting', method: 'bank_account', min:  500, max:  749, fee: 29500 },
    { id: uid('fee-bank-004'),  plan: 'smart_time_one_lighting', method: 'bank_account', min:  750, max:  999, fee: 47500 },
    { id: uid('fee-bank-005'),  plan: 'smart_time_one_lighting', method: 'bank_account', min: 1000, max: null, fee: 62500 },
    { id: uid('fee-other-001'), plan: 'smart_time_one_lighting', method: 'other',        min:    0, max:  199, fee:  6500 },
    { id: uid('fee-other-002'), plan: 'smart_time_one_lighting', method: 'other',        min:  200, max:  499, fee: 14000 },
    { id: uid('fee-other-003'), plan: 'smart_time_one_lighting', method: 'other',        min:  500, max:  749, fee: 33500 },
    { id: uid('fee-other-004'), plan: 'smart_time_one_lighting', method: 'other',        min:  750, max:  999, fee: 51500 },
    { id: uid('fee-other-005'), plan: 'smart_time_one_lighting', method: 'other',        min: 1000, max: null, fee: 66500 },
  ];

  for (const f of feeMasterData) {
    await db.execute(sql`
      INSERT INTO fee_master (id, plan_code, payment_method, kwh_min, kwh_max, fee_amount, admin_fee, effective_from, effective_to)
      VALUES (${f.id}::uuid, ${f.plan}, ${f.method}, ${f.min}, ${f.max}, ${f.fee}, 2000, '2026-01-01'::date, NULL)
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ fee_master (10 rows)');

  // ---------------------------------------------------------------------------
  // Consent text versions
  // ---------------------------------------------------------------------------
  const consentVersions = [
    { id: uid('ctv-personal-v1'), version: 'v1.0',           consentType: 'personal_info_use',         body: '当社は、お客様の個人情報を電力サービスのご提案、関連サービスの提供、太陽光発電・蓄電池等のご案内および提携先への情報提供のために利用いたします。' },
    { id: uid('ctv-combined-v2'), version: 'v2.0-combined',  consentType: 'combined_personal_solar',   body: '当社は、お客様の個人情報を電力サービスのご提案、関連サービスの提供、太陽光発電・蓄電池等のご案内および提携先への情報提供のために利用いたします。' },
    { id: uid('ctv-solar-v1'),    version: 'v1.0-solar',     consentType: 'solar_partner_share',       body: 'お客様の同意のもと、太陽光発電の導入検討のためにパートナー企業へお客様情報を提供いたします。' },
  ];

  for (const cv of consentVersions) {
    await db.execute(sql`
      INSERT INTO consent_text_versions (id, version, consent_type, body, effective_from)
      VALUES (${cv.id}::uuid, ${cv.version}, ${cv.consentType}, ${cv.body}, now())
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ consent_text_versions');

  // ---------------------------------------------------------------------------
  // Customers (10) with addresses, leads, contracts, cross-sell, consents, activities
  // ---------------------------------------------------------------------------
  type CustomerSeed = {
    key: string;
    displayId: string;
    name: string;
    kana: string;
    phone: string;
    email: string;
    ageRange: string;
    householdInfo: string;
    createdByKey: string;
    looopStatus: string;
    eventKey: string;
    staffKey: string;
    hasSolarConsent: boolean;
    prefecture: string;
    city: string;
    street: string;
    postalCode: string;
  };

  const customerSeedData: CustomerSeed[] = [
    { key: 'cust-001', displayId: 'C-00001', name: '青木一郎',   kana: 'アオキイチロウ',   phone: '090-1234-5601', email: 'aoki@example.com',     ageRange: '50s', householdInfo: '4人家族',   createdByKey: 'user-003', looopStatus: 'contracted',   eventKey: 'evt-001', staffKey: 'user-003', hasSolarConsent: true,  prefecture: '千葉県',   city: '千葉市花見川区', street: '幕張1-1-1',    postalCode: '262-0032' },
    { key: 'cust-002', displayId: 'C-00002', name: '伊藤恵子',   kana: 'イトウケイコ',     phone: '090-1234-5602', email: 'ito@example.com',      ageRange: '40s', householdInfo: '3人家族',   createdByKey: 'user-003', looopStatus: 'applied',      eventKey: 'evt-001', staffKey: 'user-003', hasSolarConsent: true,  prefecture: '千葉県',   city: '千葉市中央区',   street: '中央2-5-10',   postalCode: '260-0013' },
    { key: 'cust-003', displayId: 'C-00003', name: '上田誠',     kana: 'ウエダマコト',     phone: '090-1234-5603', email: 'ueda@example.com',     ageRange: '60s', householdInfo: '2人家族',   createdByKey: 'user-004', looopStatus: 'interested',   eventKey: 'evt-002', staffKey: 'user-004', hasSolarConsent: false, prefecture: '神奈川県', city: '横浜市緑区',     street: '長津田3-2-8',  postalCode: '226-0027' },
    { key: 'cust-004', displayId: 'C-00004', name: '遠藤幸子',   kana: 'エンドウサチコ',   phone: '090-1234-5604', email: 'endo@example.com',     ageRange: '30s', householdInfo: '5人家族',   createdByKey: 'user-004', looopStatus: 'proposed',     eventKey: 'evt-002', staffKey: 'user-004', hasSolarConsent: false, prefecture: '神奈川県', city: '横浜市青葉区',   street: '青葉台4-3-2',  postalCode: '227-0062' },
    { key: 'cust-005', displayId: 'C-00005', name: '加藤健太',   kana: 'カトウケンタ',     phone: '090-1234-5605', email: 'kato@example.com',     ageRange: '40s', householdInfo: '4人家族',   createdByKey: 'user-003', looopStatus: 'opened',       eventKey: 'evt-003', staffKey: 'user-003', hasSolarConsent: true,  prefecture: '大阪府',   city: '東大阪市',       street: '高井田5-10-3', postalCode: '578-0941' },
    { key: 'cust-006', displayId: 'C-00006', name: '木村奈緒',   kana: 'キムラナオ',       phone: '090-1234-5606', email: 'kimura@example.com',   ageRange: '50s', householdInfo: '2人家族',   createdByKey: 'user-004', looopStatus: 'not_proposed', eventKey: 'evt-003', staffKey: 'user-004', hasSolarConsent: false, prefecture: '大阪府',   city: '大阪市旭区',     street: '大宮6-4-1',    postalCode: '535-0021' },
    { key: 'cust-007', displayId: 'C-00007', name: '桑原隆',     kana: 'クワハラタカシ',   phone: '090-1234-5607', email: 'kuwahara@example.com', ageRange: '60s', householdInfo: '1人暮らし', createdByKey: 'user-003', looopStatus: 'cancelled',    eventKey: 'evt-004', staffKey: 'user-003', hasSolarConsent: false, prefecture: '埼玉県',   city: '熊谷市',         street: '石原7-1-5',    postalCode: '360-0042' },
    { key: 'cust-008', displayId: 'C-00008', name: '小林正美',   kana: 'コバヤシマサミ',   phone: '090-1234-5608', email: 'kobayashi@example.com',ageRange: '40s', householdInfo: '3人家族',   createdByKey: 'user-004', looopStatus: 'under_review', eventKey: 'evt-004', staffKey: 'user-004', hasSolarConsent: true,  prefecture: '埼玉県',   city: '行田市',         street: '本町8-2-10',   postalCode: '361-0052' },
    { key: 'cust-009', displayId: 'C-00009', name: '斎藤まり',   kana: 'サイトウマリ',     phone: '090-1234-5609', email: 'saito@example.com',    ageRange: '30s', householdInfo: '4人家族',   createdByKey: 'user-003', looopStatus: 'contracted',   eventKey: 'evt-005', staffKey: 'user-003', hasSolarConsent: true,  prefecture: '宮城県',   city: '仙台市泉区',     street: '泉中央9-5-3',  postalCode: '981-3133' },
    { key: 'cust-010', displayId: 'C-00010', name: '坂本雄介',   kana: 'サカモトユウスケ', phone: '090-1234-5610', email: 'sakamoto@example.com', ageRange: '50s', householdInfo: '2人家族',   createdByKey: 'user-004', looopStatus: 'interested',   eventKey: 'evt-005', staffKey: 'user-004', hasSolarConsent: false, prefecture: '宮城県',   city: '仙台市青葉区',   street: '青葉10-1-1',   postalCode: '980-0011' },
  ];

  for (const c of customerSeedData) {
    const customerId = uid(c.key);
    const staffId = uid(c.staffKey);
    const createdById = uid(c.createdByKey);
    const eventId = uid(c.eventKey);

    const phoneBuf = Buffer.from(c.phone, 'utf8');
    const emailBuf = Buffer.from(c.email, 'utf8');
    await db.execute(sql`
      INSERT INTO customers (id, display_id, name, kana, phone_enc, phone_hash, email_enc, age_range, household_info, created_by)
      VALUES (${customerId}::uuid, ${c.displayId}, ${c.name}, ${c.kana},
              ${phoneBuf}, ${phoneBuf}, ${emailBuf},
              ${c.ageRange}, ${c.householdInfo}, ${createdById}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO customer_addresses (id, customer_id, is_primary, postal_code, prefecture, city, street, accuracy_status)
      VALUES (${uid('addr-' + c.key)}::uuid, ${customerId}::uuid, true, ${c.postalCode}, ${c.prefecture}, ${c.city}, ${c.street}, 'unconfirmed')
      ON CONFLICT (id) DO NOTHING
    `);

    const leadId = uid('lead-' + c.key);
    await db.execute(sql`
      INSERT INTO leads (id, customer_id, event_id, staff_id, lead_status, source)
      VALUES (${leadId}::uuid, ${customerId}::uuid, ${eventId}::uuid, ${staffId}::uuid, 'new', 'event')
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO looop_contracts (id, customer_id, lead_id, status, unit_price, payment_status)
      VALUES (${uid('lc-' + c.key)}::uuid, ${customerId}::uuid, ${leadId}::uuid, ${c.looopStatus}, 30000, 'unbilled')
      ON CONFLICT (id) DO NOTHING
    `);

    const xsStatus = c.hasSolarConsent ? 'interested' : 'not_proposed';
    await db.execute(sql`
      INSERT INTO cross_sell_opportunities (id, customer_id, product_type, status)
      VALUES (${uid('xs-' + c.key)}::uuid, ${customerId}::uuid, 'solar', ${xsStatus})
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO consents (id, customer_id, consent_type, consent_status, consent_text_version, consented_at, consented_by)
      VALUES (${uid('consent-piu-' + c.key)}::uuid, ${customerId}::uuid, 'personal_info_use', 'granted', 'v1.0', now(), ${staffId}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);

    if (c.hasSolarConsent) {
      await db.execute(sql`
        INSERT INTO consents (id, customer_id, consent_type, consent_status, consent_text_version, consented_at, consented_by)
        VALUES (${uid('consent-solar-' + c.key)}::uuid, ${customerId}::uuid, 'solar_partner_share', 'granted', 'v1.0-solar', now(), ${staffId}::uuid)
        ON CONFLICT (id) DO NOTHING
      `);
    }

    await db.execute(sql`
      INSERT INTO activities (id, customer_id, staff_id, activity_type, content)
      VALUES (${uid('act-' + c.key)}::uuid, ${customerId}::uuid, ${staffId}::uuid, 'memo', '催事にて接客。電力プランに興味あり。')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  console.log('  ✓ customers (10) with addresses, leads, contracts, cross-sell, consents, activities');
  console.log('');
  console.log('✅ Seed complete!');
}
