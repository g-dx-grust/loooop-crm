import fs from 'node:fs';
import path from 'node:path';
import { inArray, notInArray, ne, like, or, sql, eq } from 'drizzle-orm';

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
import {
  customers,
  events,
  users,
  teams,
  leads,
  looopContracts,
  electricityBills,
  refunds,
  partnerHandoffs,
  partnerCompanies,
} from './schema';

const KEEP_EMAILS = [
  'kawaguchi@n-grust.co.jp',
  'kato@n-grust.co.jp',
  'miyazawa@n-grust.co.jp',
  'kimuchichige192@gmail.com',
  'looptestkanri@n-grust.co.jp',
  'looptestgenba@n-grust.co.jp',
];

const isDemoName = (col: Parameters<typeof like>[0]) =>
  or(like(col, '%デモ%'), like(col, '%テスト%'))!;

async function runDeleteDemo() {
  const db = getPgDb();
  console.log('🗑️  Looop CRM デモデータ削除を開始します...\n');

  // ──────────────────────────────────────────────
  // デモ顧客 ID を収集
  // ──────────────────────────────────────────────
  const demoCustomerRows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      or(
        like(customers.displayId, 'DC-%'),
        like(customers.name, '%デモ%'),
        like(customers.name, '%テスト%'),
        like(customers.kana, '%デモ%'),
        like(customers.kana, '%テスト%'),
      ),
    );
  const demoIds = demoCustomerRows.map((r) => r.id);

  if (demoIds.length === 0) {
    console.log('ℹ️  デモ顧客が見つかりませんでした。顧客関連処理をスキップします。');
  } else {
    console.log(`  対象デモ顧客: ${demoIds.length} 件`);

    // [1] partner_handoffs (RESTRICT FK → customers)
    const ph = await db
      .delete(partnerHandoffs)
      .where(inArray(partnerHandoffs.customerId, demoIds))
      .returning({ id: partnerHandoffs.id });
    console.log(`  [1] partner_handoffs   削除: ${ph.length} 件`);

    // [2] electricity_bills (RESTRICT FK → customers)
    const eb = await db
      .delete(electricityBills)
      .where(inArray(electricityBills.customerId, demoIds))
      .returning({ id: electricityBills.id });
    console.log(`  [2] electricity_bills  削除: ${eb.length} 件`);

    // [3] refunds (RESTRICT FK → customers)
    const rf = await db
      .delete(refunds)
      .where(inArray(refunds.customerId, demoIds))
      .returning({ id: refunds.id });
    console.log(`  [3] refunds            削除: ${rf.length} 件`);

    // [4] looop_contracts (RESTRICT FK → customers)
    const lc = await db
      .delete(looopContracts)
      .where(inArray(looopContracts.customerId, demoIds))
      .returning({ id: looopContracts.id });
    console.log(`  [4] looop_contracts    削除: ${lc.length} 件`);

    // [5] leads (RESTRICT FK → customers)
    const ld = await db
      .delete(leads)
      .where(inArray(leads.customerId, demoIds))
      .returning({ id: leads.id });
    console.log(`  [5] leads              削除: ${ld.length} 件`);

    // [6] customers (CASCADE: addresses / cross_sell / consents / activities / files)
    const cu = await db
      .delete(customers)
      .where(inArray(customers.id, demoIds))
      .returning({ id: customers.id });
    console.log(`  [6] customers          削除: ${cu.length} 件  (CASCADE: addresses / cross_sell / consents / activities / files)`);
  }

  // [7] デモ催事
  const ev = await db
    .delete(events)
    .where(or(isDemoName(events.eventName), isDemoName(events.venueName)))
    .returning({ id: events.id });
  console.log(`  [7] events             削除: ${ev.length} 件`);

  // [8] デモ partner_companies → inactive 化
  const pc = await db
    .update(partnerCompanies)
    .set({ active: false })
    .where(or(isDemoName(partnerCompanies.name))!)
    .returning({ id: partnerCompanies.id });
  console.log(`  [8] partner_companies  inactive化: ${pc.length} 件`);

  // [9] デモ teams → inactive 化
  const tm = await db
    .update(teams)
    .set({ active: false })
    .where(or(isDemoName(teams.name))!)
    .returning({ id: teams.id });
  console.log(`  [9] teams              inactive化: ${tm.length} 件`);

  // [10] 保持対象外ユーザー → suspended 化
  const us = await db
    .update(users)
    .set({ status: 'suspended' })
    .where(
      notInArray(users.email, KEEP_EMAILS),
    )
    .returning({ id: users.id });
  console.log(`  [10] users             suspended化: ${us.length} 件`);

  // ──────────────────────────────────────────────
  // 残存件数サマリー
  // ──────────────────────────────────────────────
  type CountRow = { customers_remaining: string; looop_contracts_remaining: string; cross_sell_remaining: string; electricity_bills_remaining: string; events_remaining: string; users_active: string; users_suspended: string };
  const summary = (await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM customers                WHERE deleted_at IS NULL) AS customers_remaining,
      (SELECT COUNT(*) FROM looop_contracts          WHERE deleted_at IS NULL) AS looop_contracts_remaining,
      (SELECT COUNT(*) FROM cross_sell_opportunities WHERE deleted_at IS NULL) AS cross_sell_remaining,
      (SELECT COUNT(*) FROM electricity_bills        WHERE deleted_at IS NULL) AS electricity_bills_remaining,
      (SELECT COUNT(*) FROM events                   WHERE deleted_at IS NULL) AS events_remaining,
      (SELECT COUNT(*) FROM users                    WHERE status = 'active')  AS users_active,
      (SELECT COUNT(*) FROM users                    WHERE status = 'suspended') AS users_suspended
  `)) as CountRow[];

  const s = summary[0] ?? ({} as CountRow);
  console.log('\n📊 残存件数:');
  console.log(`   customers:         ${s.customers_remaining}`);
  console.log(`   looop_contracts:   ${s.looop_contracts_remaining}`);
  console.log(`   cross_sell:        ${s.cross_sell_remaining}`);
  console.log(`   electricity_bills: ${s.electricity_bills_remaining}`);
  console.log(`   events:            ${s.events_remaining}`);
  console.log(`   users (active):    ${s.users_active}`);
  console.log(`   users (suspended): ${s.users_suspended}`);
  console.log('\n✅ デモデータ削除完了');
}

runDeleteDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ エラー:', err);
    process.exit(1);
  });
