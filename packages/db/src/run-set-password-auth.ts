/**
 * 対象6ユーザーを auth_provider='password' に変更し、
 * password_hash を 'Looop2026!' のハッシュにセットする。
 *
 * 実行: npm run --filter @looop/db set-password-auth
 * または: tsx src/run-set-password-auth.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';

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
import { users, userRoles, roles } from './schema';
import { eq, sql } from 'drizzle-orm';

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const TARGET_EMAILS = [
  'kawaguchi@n-grust.co.jp',
  'kato@n-grust.co.jp',
  'miyazawa@n-grust.co.jp',
  'kimuchichige192@gmail.com',
  'looptestkanri@n-grust.co.jp',
  'looptestgenba@n-grust.co.jp',
];

async function run() {
  const db = getPgDb();
  const passwordHash = hashPassword('Looop2026!');

  console.log('🔑 auth_provider → password 変換を開始します...\n');

  let updated = 0;
  for (const email of TARGET_EMAILS) {
    const result = await db
      .update(users)
      .set({
        authProvider: 'password',
        passwordHash,
      })
      .where(eq(users.email, email))
      .returning({ id: users.id, email: users.email, authProvider: users.authProvider });

    if (result[0]) {
      console.log(`  ✓ ${email}`);
      updated++;
    } else {
      console.log(`  ⚠ 見つかりません: ${email}`);
    }
  }

  console.log(`\n✅ 完了: ${updated} / ${TARGET_EMAILS.length} 件を更新しました`);
  console.log('   auth_provider = password');
  console.log('   password_hash = hash(Looop2026!)');

  // 確認クエリ
  const check = await db
    .select({
      email: users.email,
      authProvider: users.authProvider,
      status: users.status,
      hasPassword: sql<boolean>`password_hash IS NOT NULL`,
    })
    .from(users)
    .where(sql`email = ANY(${sql.raw(`ARRAY[${TARGET_EMAILS.map((e) => `'${e}'`).join(',')}]`)})`);

  console.log('\n📋 確認:');
  for (const u of check) {
    const ok = u.authProvider === 'password' && u.hasPassword && u.status === 'active';
    console.log(`  ${ok ? '✓' : '✗'} ${u.email}  provider=${u.authProvider}  status=${u.status}  password=${u.hasPassword ? 'set' : 'NONE'}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ エラー:', err);
    process.exit(1);
  });
