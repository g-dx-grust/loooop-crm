/**
 * Seed script for Supabase (Postgres) development database.
 * 冪等: PK / unique 制約を持つ列に対して ON CONFLICT DO NOTHING を使用。
 * テーブル作成は drizzle migrations 側に任せる（事前に migration を流すこと）。
 *
 * ロール: admin（管理者）/ field（現場スタッフ）の 2 種類のみ。
 * デモパスワード: Looop2026!
 */
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';

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
  // Roles (admin / field のみ)
  // ---------------------------------------------------------------------------
  const roleData = [
    { id: uid('role-admin'), code: 'admin', name: '管理者' },
    { id: uid('role-field'), code: 'field', name: '現場スタッフ' },
  ];

  for (const r of roleData) {
    await db.execute(sql`
      INSERT INTO roles (id, code, name)
      VALUES (${r.id}::uuid, ${r.code}, ${r.name})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    `);
  }
  console.log('  ✓ roles (admin / field)');

  // ---------------------------------------------------------------------------
  // Staff users (デモ用)
  // ---------------------------------------------------------------------------
  const pw = hashPasswordForSeed('Looop2026!');
  const staffData = [
    // 管理者
    { id: uid('user-kawaguchi'), externalUserId: null, displayName: '川口凌',            email: 'kawaguchi@n-grust.co.jp',      roleCode: 'admin', authProvider: 'password', passwordHash: pw, affiliation: 'N-Grust' },
    { id: uid('user-kato'),      externalUserId: null, displayName: '加藤僚',            email: 'kato@n-grust.co.jp',           roleCode: 'admin', authProvider: 'password', passwordHash: pw, affiliation: 'N-Grust' },
    { id: uid('user-miyazawa'), externalUserId: null,  displayName: '宮澤健一',          email: 'miyazawa@n-grust.co.jp',       roleCode: 'admin', authProvider: 'password', passwordHash: pw, affiliation: 'N-Grust' },
    { id: uid('user-testadmin'), externalUserId: null, displayName: 'テスト管理者',      email: 'looptestkanri@n-grust.co.jp',  roleCode: 'admin', authProvider: 'password', passwordHash: pw, affiliation: 'N-Grust' },
    // 現場スタッフ
    { id: uid('user-kikuchi'),   externalUserId: null, displayName: '菊池海成',          email: 'kimuchichige192@gmail.com',    roleCode: 'field', authProvider: 'password', passwordHash: pw, affiliation: 'N-Grust' },
    { id: uid('user-testfield'), externalUserId: null, displayName: 'テスト現場スタッフ', email: 'looptestgenba@n-grust.co.jp',  roleCode: 'field', authProvider: 'password', passwordHash: pw, affiliation: 'N-Grust' },
  ];

  for (const u of staffData) {
    const roleId = u.roleCode === 'admin' ? uid('role-admin') : uid('role-field');
    await db.execute(sql`
      INSERT INTO users (id, external_user_id, display_name, email, affiliation, status, auth_provider, password_hash)
      VALUES (${u.id}::uuid, ${u.externalUserId}, ${u.displayName}, ${u.email}, ${u.affiliation}, 'active', ${u.authProvider}, ${u.passwordHash})
      ON CONFLICT (email) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            auth_provider = EXCLUDED.auth_provider,
            password_hash = EXCLUDED.password_hash,
            affiliation   = EXCLUDED.affiliation,
            status        = 'active'
    `);
    // user_roles: まず古い割り当てを削除して付け直す（冪等）
    await db.execute(sql`
      DELETE FROM user_roles
      WHERE user_id = (SELECT id FROM users WHERE email = ${u.email})
    `);
    await db.execute(sql`
      INSERT INTO user_roles (user_id, role_id, scope)
      SELECT id, ${roleId}::uuid, '{}'::jsonb FROM users WHERE email = ${u.email}
      ON CONFLICT DO NOTHING
    `);
  }
  console.log('  ✓ users (6) + user_roles');

  // ---------------------------------------------------------------------------
  // Events (催事会場)
  // ---------------------------------------------------------------------------
  const adminId = `(SELECT id FROM users WHERE email = 'kawaguchi@n-grust.co.jp' LIMIT 1)`;
  const fieldId1 = `(SELECT id FROM users WHERE email = 'kimuchichige192@gmail.com' LIMIT 1)`;
  const fieldId2 = `(SELECT id FROM users WHERE email = 'looptestgenba@n-grust.co.jp' LIMIT 1)`;

  const eventData = [
    { id: uid('evt-001'), name: 'デモ催事 イオンモール幕張 2026-06', venue: 'イオンモール幕張新都心', addr: '千葉県千葉市花見川区幕張町1', date: '2026-06-01', area: '関東', staffEmail: 'kimuchichige192@gmail.com',   status: 'active' },
    { id: uid('evt-002'), name: 'デモ催事 ビバホーム長津田 2026-06', venue: 'ビバホーム長津田店',     addr: '神奈川県横浜市緑区長津田3',   date: '2026-06-08', area: '関東', staffEmail: 'looptestgenba@n-grust.co.jp', status: 'active' },
    { id: uid('evt-003'), name: 'デモ催事 コーナン東大阪 2026-06',   venue: 'コーナン東大阪店',       addr: '大阪府東大阪市高井田5',       date: '2026-06-15', area: '関西', staffEmail: 'kimuchichige192@gmail.com',   status: 'scheduled' },
    { id: uid('evt-004'), name: 'デモ催事 カインズ熊谷 2026-06',     venue: 'カインズホーム熊谷店',   addr: '埼玉県熊谷市石原7',           date: '2026-06-22', area: '関東', staffEmail: 'looptestgenba@n-grust.co.jp', status: 'scheduled' },
    { id: uid('evt-005'), name: 'デモ催事 DCM仙台 2026-06',          venue: 'DCM仙台泉店',            addr: '宮城県仙台市泉区泉中央',      date: '2026-06-29', area: '東北', staffEmail: 'kimuchichige192@gmail.com',   status: 'scheduled' },
  ];

  for (const e of eventData) {
    await db.execute(sql`
      INSERT INTO events (id, event_name, venue_name, venue_address, event_date, area,
        staff_id, status)
      VALUES (${e.id}::uuid, ${e.name}, ${e.venue}, ${e.addr}, ${e.date}::date, ${e.area},
        (SELECT id FROM users WHERE email = ${e.staffEmail} LIMIT 1),
        ${e.status})
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ events (5)');

  // ---------------------------------------------------------------------------
  // Consent text versions
  // ---------------------------------------------------------------------------
  await db.execute(sql`
    INSERT INTO consent_text_versions (id, version, consent_type, body, effective_from)
    VALUES
      (${uid('ctv-combined-v2')}::uuid, 'v2.0-combined', 'combined_personal_solar',
       '当社は、お客様の個人情報を電力サービスのご提案、関連サービスの提供、太陽光発電・蓄電池等のご案内および提携先への情報提供のために利用いたします。', now())
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('  ✓ consent_text_versions');

  // ---------------------------------------------------------------------------
  // Fee master
  // ---------------------------------------------------------------------------
  const feeMasterData = [
    { id: uid('fee-bank-001'), plan: 'smart_time_one_lighting', method: 'bank_account', min:    0, max: 199 as number | null, fee:  3000 },
    { id: uid('fee-bank-002'), plan: 'smart_time_one_lighting', method: 'bank_account', min:  200, max:  499,                 fee: 10000 },
    { id: uid('fee-bank-003'), plan: 'smart_time_one_lighting', method: 'bank_account', min:  500, max:  749,                 fee: 29500 },
    { id: uid('fee-bank-004'), plan: 'smart_time_one_lighting', method: 'bank_account', min:  750, max:  999,                 fee: 47500 },
    { id: uid('fee-bank-005'), plan: 'smart_time_one_lighting', method: 'bank_account', min: 1000, max: null,                 fee: 62500 },
  ];

  for (const f of feeMasterData) {
    await db.execute(sql`
      INSERT INTO fee_master (id, plan_code, payment_method, kwh_min, kwh_max, fee_amount, admin_fee, effective_from)
      VALUES (${f.id}::uuid, ${f.plan}, ${f.method}, ${f.min}, ${f.max}, ${f.fee}, 2000, '2026-01-01'::date)
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('  ✓ fee_master');

  // ---------------------------------------------------------------------------
  // Demo customers (各種ステータスを網羅; デモデータと分かる名前)
  // ---------------------------------------------------------------------------
  type CustEntry = {
    key: string; displayId: string; name: string; kana: string;
    phone: string; email: string;
    staffEmail: string; eventKey: string;
    looopStatus: string; revenueMonth: string | null; paymentStatus: string;
    unitPrice: number;
    xsProduct: string; xsStatus: string; xsRevenue: number | null;
    hasSolarConsent: boolean;
    prefecture: string; city: string; street: string; postalCode: string;
  };

  const custData: CustEntry[] = [
    // 菊池担当
    { key: 'dc-001', displayId: 'DC-001', name: 'デモ顧客 完了A', kana: 'デモコキャクカンリョウエー', phone: '09011110001', email: 'demo001@example.com', staffEmail: 'kimuchichige192@gmail.com',   eventKey: 'evt-001', looopStatus: 'completed',      revenueMonth: '2026-04', paymentStatus: 'paid',    unitPrice: 29500, xsProduct: 'solar',   xsStatus: 'won',          xsRevenue: 150000, hasSolarConsent: true,  prefecture: '千葉県',   city: '千葉市花見川区', street: '幕張1-1-1',    postalCode: '2620032' },
    { key: 'dc-002', displayId: 'DC-002', name: 'デモ顧客 完了B', kana: 'デモコキャクカンリョウビー', phone: '09011110002', email: 'demo002@example.com', staffEmail: 'kimuchichige192@gmail.com',   eventKey: 'evt-001', looopStatus: 'completed',      revenueMonth: '2026-05', paymentStatus: 'paid',    unitPrice: 47500, xsProduct: 'battery', xsStatus: 'won',          xsRevenue: 200000, hasSolarConsent: true,  prefecture: '千葉県',   city: '千葉市中央区',   street: '中央2-5-10',   postalCode: '2600013' },
    { key: 'dc-003', displayId: 'DC-003', name: 'デモ顧客 申込中', kana: 'デモコキャクモウシコミ',   phone: '09011110003', email: 'demo003@example.com', staffEmail: 'kimuchichige192@gmail.com',   eventKey: 'evt-001', looopStatus: 'applied',        revenueMonth: null,      paymentStatus: 'unbilled', unitPrice: 29500, xsProduct: 'water',   xsStatus: 'proposed',     xsRevenue: null,   hasSolarConsent: false, prefecture: '千葉県',   city: '千葉市若葉区',   street: '若葉3-3-3',    postalCode: '2640028' },
    { key: 'dc-004', displayId: 'DC-004', name: 'デモ顧客 キャンセル', kana: 'デモコキャクキャンセル', phone: '09011110004', email: 'demo004@example.com', staffEmail: 'kimuchichige192@gmail.com', eventKey: 'evt-003', looopStatus: 'cancelled',      revenueMonth: null,      paymentStatus: 'unbilled', unitPrice: 29500, xsProduct: 'solar',   xsStatus: 'lost',         xsRevenue: null,   hasSolarConsent: false, prefecture: '大阪府',   city: '東大阪市',       street: '高井田4-4-4',  postalCode: '5780941' },
    { key: 'dc-005', displayId: 'DC-005', name: 'デモ顧客 マッチングエラー', kana: 'デモコキャクマッチングエラー', phone: '09011110005', email: 'demo005@example.com', staffEmail: 'kimuchichige192@gmail.com', eventKey: 'evt-003', looopStatus: 'matching_error', revenueMonth: null, paymentStatus: 'unbilled', unitPrice: 29500, xsProduct: 'hikari', xsStatus: 'not_proposed', xsRevenue: null, hasSolarConsent: false, prefecture: '大阪府', city: '大阪市旭区', street: '大宮5-5-5', postalCode: '5350021' },

    // テスト現場スタッフ担当
    { key: 'dc-006', displayId: 'DC-006', name: 'デモ顧客 完了C', kana: 'デモコキャクカンリョウシー', phone: '09011110006', email: 'demo006@example.com', staffEmail: 'looptestgenba@n-grust.co.jp', eventKey: 'evt-002', looopStatus: 'completed',      revenueMonth: '2026-05', paymentStatus: 'paid',    unitPrice: 10000, xsProduct: 'mobile',  xsStatus: 'won',          xsRevenue: 50000,  hasSolarConsent: true,  prefecture: '神奈川県', city: '横浜市緑区',     street: '長津田6-6-6',  postalCode: '2260027' },
    { key: 'dc-007', displayId: 'DC-007', name: 'デモ顧客 審査中', kana: 'デモコキャクシンサチュウ',   phone: '09011110007', email: 'demo007@example.com', staffEmail: 'looptestgenba@n-grust.co.jp', eventKey: 'evt-002', looopStatus: 'applied',        revenueMonth: null,      paymentStatus: 'unbilled', unitPrice: 62500, xsProduct: 'solar',   xsStatus: 'interested',   xsRevenue: null,   hasSolarConsent: true,  prefecture: '神奈川県', city: '横浜市青葉区',   street: '青葉台7-7-7',  postalCode: '2270062' },
    { key: 'dc-008', displayId: 'DC-008', name: 'デモ顧客 提案済み', kana: 'デモコキャクテイアンスミ', phone: '09011110008', email: 'demo008@example.com', staffEmail: 'looptestgenba@n-grust.co.jp', eventKey: 'evt-004', looopStatus: 'applied',        revenueMonth: null,      paymentStatus: 'unbilled', unitPrice: 29500, xsProduct: 'battery', xsStatus: 'callback',     xsRevenue: null,   hasSolarConsent: false, prefecture: '埼玉県',   city: '熊谷市',         street: '石原8-8-8',    postalCode: '3600042' },
    { key: 'dc-009', displayId: 'DC-009', name: 'デモ顧客 未提案',  kana: 'デモコキャクミテイアン',   phone: '09011110009', email: 'demo009@example.com', staffEmail: 'looptestgenba@n-grust.co.jp', eventKey: 'evt-004', looopStatus: 'applied',        revenueMonth: null,      paymentStatus: 'unbilled', unitPrice: 29500, xsProduct: 'hikari',  xsStatus: 'not_proposed', xsRevenue: null,   hasSolarConsent: false, prefecture: '埼玉県',   city: '行田市',         street: '本町9-9-9',    postalCode: '3610052' },
    { key: 'dc-010', displayId: 'DC-010', name: 'デモ顧客 失注',    kana: 'デモコキャクシッチュウ',   phone: '09011110010', email: 'demo010@example.com', staffEmail: 'looptestgenba@n-grust.co.jp', eventKey: 'evt-005', looopStatus: 'completed',      revenueMonth: '2026-04', paymentStatus: 'paid',    unitPrice: 47500, xsProduct: 'water',   xsStatus: 'lost',         xsRevenue: null,   hasSolarConsent: true,  prefecture: '宮城県',   city: '仙台市泉区',     street: '泉中央10-1-1', postalCode: '9813133' },
  ];

  for (const c of custData) {
    const cid = uid(c.key);
    const lid = uid('lead-' + c.key);
    const phoneBuf = Buffer.from(c.phone, 'utf8');
    const emailBuf = Buffer.from(c.email, 'utf8');
    const staffIdSql = c.staffEmail;
    const evtId = uid(c.eventKey);

    await db.execute(sql`
      INSERT INTO customers (id, display_id, name, kana, phone_enc, phone_hash, email_enc,
        created_by)
      VALUES (${cid}::uuid, ${c.displayId}, ${c.name}, ${c.kana},
              ${phoneBuf}, ${phoneBuf}, ${emailBuf},
              (SELECT id FROM users WHERE email = ${staffIdSql} LIMIT 1))
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO customer_addresses (id, customer_id, is_primary, postal_code, prefecture,
        city, street, accuracy_status)
      VALUES (${uid('addr-' + c.key)}::uuid, ${cid}::uuid, true,
              ${c.postalCode}, ${c.prefecture}, ${c.city}, ${c.street}, 'unconfirmed')
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO leads (id, customer_id, event_id, staff_id, lead_status, source)
      VALUES (${lid}::uuid, ${cid}::uuid, ${evtId}::uuid,
              (SELECT id FROM users WHERE email = ${staffIdSql} LIMIT 1),
              'qualified', 'event')
      ON CONFLICT (id) DO NOTHING
    `);

    const appDate = c.looopStatus === 'applied' || c.looopStatus === 'completed' ? '2026-04-01' : null;
    const openedDate = c.looopStatus === 'completed' ? '2026-05-01' : null;

    await db.execute(sql`
      INSERT INTO looop_contracts (id, customer_id, lead_id, status, unit_price,
        revenue_month, payment_status, application_date, opened_date)
      VALUES (${uid('lc-' + c.key)}::uuid, ${cid}::uuid, ${lid}::uuid,
              ${c.looopStatus}, ${c.unitPrice},
              ${c.revenueMonth}, ${c.paymentStatus},
              ${appDate}::date, ${openedDate}::date)
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO cross_sell_opportunities (id, customer_id, product_type, status,
        actual_revenue)
      VALUES (${uid('xs-' + c.key)}::uuid, ${cid}::uuid,
              ${c.xsProduct}, ${c.xsStatus}, ${c.xsRevenue})
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO consents (id, customer_id, consent_type, consent_status,
        consent_text_version, consented_at, consented_by)
      VALUES (${uid('con-piu-' + c.key)}::uuid, ${cid}::uuid,
              'personal_info_use', 'granted', 'v2.0-combined', now(),
              (SELECT id FROM users WHERE email = ${staffIdSql} LIMIT 1))
      ON CONFLICT (id) DO NOTHING
    `);

    if (c.hasSolarConsent) {
      await db.execute(sql`
        INSERT INTO consents (id, customer_id, consent_type, consent_status,
          consent_text_version, consented_at, consented_by)
        VALUES (${uid('con-solar-' + c.key)}::uuid, ${cid}::uuid,
                'solar_partner_share', 'granted', 'v2.0-combined', now(),
                (SELECT id FROM users WHERE email = ${staffIdSql} LIMIT 1))
        ON CONFLICT (id) DO NOTHING
      `);
    }

    await db.execute(sql`
      INSERT INTO activities (id, customer_id, staff_id, activity_type, content)
      VALUES (${uid('act-' + c.key)}::uuid, ${cid}::uuid,
              (SELECT id FROM users WHERE email = ${staffIdSql} LIMIT 1),
              'memo', 'デモデータ: 催事にて接客。')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  console.log('  ✓ demo customers (10) with leads, contracts, cross-sell, consents');
  console.log('');
  console.log('✅ Seed complete!');
  console.log('   管理者 (password: Looop2026!):');
  console.log('     kawaguchi@n-grust.co.jp / kato@n-grust.co.jp / miyazawa@n-grust.co.jp');
  console.log('     looptestkanri@n-grust.co.jp');
  console.log('   現場スタッフ (password: Looop2026!):');
  console.log('     kimuchichige192@gmail.com / looptestgenba@n-grust.co.jp');
}
