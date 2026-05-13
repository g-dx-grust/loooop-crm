'use server';

import { redirect } from 'next/navigation';
import {
  db,
  customers,
  customerAddresses,
  leads,
  looopContracts,
  consents,
  consentTextVersions,
  auditLogs,
  events,
  eq,
  and,
  isNull,
  desc,
  sql,
} from '@looop/db';
import type { AddressFormValues } from '@/components/address/address-form';
import type { ConsentValues } from '@/components/consent/consent-checkboxes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface IntakeFormValues {
  // Step 1
  name: string;
  kana: string;
  phone: string;
  birthDate: string;
  email: string;
  // Step 2
  address: AddressFormValues;
  // Step 3
  monthlyElectricBill: string;
  wattage: string;
  billUsageMonth: string;
  eventId: string;
  // Step 4
  consent: ConsentValues;
}

export interface ConsentTextForIntake {
  version: string;
  body: string;
}

const DEFAULT_CONSENT_TEXT: ConsentTextForIntake = {
  version: 'v2.0-combined',
  body: '当社は、お客様から取得した氏名、電話番号、生年月日、メールアドレス、住所、Googleマップ上の位置情報、電気使用状況、催事会場等の情報を、Looopでんきの申込対応、関連サービスのご案内、アフターフォロー、今後のサービス改善のために利用します。また、太陽光発電・蓄電池等のご案内、見積、連絡を目的として、当社提携先の太陽光・蓄電池販売会社に、氏名、電話番号、メールアドレス、住所、Googleマップ上の位置情報、電気使用状況を提供することがあります。',
};

function normalizeDigits(value: string): string {
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[^0-9]/g, '');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isFutureDate(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function isFutureMonth(value: string): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}$/.test(value)) return true;
  const [year, month] = value.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return true;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
}

async function resolveLatestConsentText(): Promise<ConsentTextForIntake> {
  const rows = await db
    .select({
      version: consentTextVersions.version,
      body: consentTextVersions.body,
    })
    .from(consentTextVersions)
    .where(eq(consentTextVersions.consentType, 'combined_personal_solar'))
    .orderBy(desc(consentTextVersions.effectiveFrom), desc(consentTextVersions.createdAt))
    .limit(1);

  return rows[0] ?? DEFAULT_CONSENT_TEXT;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------
export async function createCustomer(
  input: IntakeFormValues,
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  // redirect is only used after success — not inside this function
  void redirect;

  try {
    // Generate a short display ID
    const displayId = `C${Date.now().toString(36).toUpperCase()}`;
    const phoneClean = normalizeDigits(input.phone);
    const email = input.email.trim();
    const postalCode = normalizeDigits(input.address.postalCode);
    const monthlyElectricBill = input.monthlyElectricBill
      ? Number.parseInt(normalizeDigits(input.monthlyElectricBill), 10)
      : null;
    const wattage = input.wattage ? Number.parseInt(normalizeDigits(input.wattage), 10) : null;

    if (!input.name.trim()) {
      return { success: false, error: '氏名を入力してください。' };
    }
    if (!/^0\d{9,10}$/.test(phoneClean)) {
      return { success: false, error: '電話番号は10〜11桁の半角数字で入力してください。' };
    }
    if (!email) {
      return { success: false, error: 'メールアドレスを入力してください。' };
    }
    if (!isValidEmail(email)) {
      return { success: false, error: 'メールアドレスの形式で入力してください。' };
    }
    if (input.birthDate && isFutureDate(input.birthDate)) {
      return { success: false, error: '生年月日は未来日を指定できません。' };
    }
    if (!postalCode || postalCode.length !== 7) {
      return { success: false, error: '郵便番号は7桁で入力してください。' };
    }
    if (!input.address.prefecture.trim() || !input.address.city.trim() || !input.address.street.trim()) {
      return { success: false, error: '住所を入力してください。' };
    }
    if (!input.address.pinConfirmed) {
      return { success: false, error: '地図のピン位置を確定してください。' };
    }
    if (
      monthlyElectricBill !== null &&
      (!Number.isFinite(monthlyElectricBill) || monthlyElectricBill < 0 || monthlyElectricBill > 300000)
    ) {
      return { success: false, error: '月間の電気料金は0〜300,000円の範囲で入力してください。' };
    }
    if (wattage !== null && (!Number.isFinite(wattage) || wattage < 0 || wattage > 200000)) {
      return { success: false, error: 'ワット数は0〜200,000Wの範囲で入力してください。' };
    }
    if (input.billUsageMonth && isFutureMonth(input.billUsageMonth)) {
      return { success: false, error: '明細の利用月は未来月を指定できません。' };
    }
    if (!input.eventId) {
      return { success: false, error: '催事会場を選択してください。' };
    }
    if (!input.consent.personalInfoConsent) {
      return { success: false, error: '個人情報の取得・利用への同意が必要です。' };
    }

    const activeEvent = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.id, input.eventId),
          isNull(events.deletedAt),
          sql`${events.status} IN ('active', 'scheduled')`,
        ),
      )
      .limit(1);

    if (!activeEvent[0]) {
      return { success: false, error: '選択した催事会場は現在利用できません。' };
    }

    const consentText = await resolveLatestConsentText();
    let customerId = '';

    // better-sqlite3 transaction is synchronous
    db.transaction((tx) => {
      // 1. Insert customer
      const customerInsert = tx
        .insert(customers)
        .values({
          displayId,
          name: input.name,
          kana: input.kana || null,
          phoneEnc: phoneClean,
          phoneHash: phoneClean,
          birthDate: input.birthDate || null,
          emailEnc: email,
          createdBy: null,
        })
        .returning({ id: customers.id })
        .all();

      const custId = customerInsert[0]?.id;
      if (!custId) throw new Error('顧客の登録に失敗しました。');
      customerId = custId;

      // 2. Insert customer_address
      const addr = input.address;
      const addressText = [addr.prefecture, addr.city, addr.street, addr.building]
        .filter(Boolean)
        .join('');

      tx.insert(customerAddresses)
        .values({
          customerId: custId,
          isPrimary: true,
          postalCode,
          prefecture: addr.prefecture || null,
          city: addr.city || null,
          street: addr.street || null,
          building: addr.building || null,
          addressText: addressText || null,
          googleFormattedAddress: addr.googleFormattedAddress ?? null,
          googleMapsUrl: addr.googleMapsUrl ?? null,
          latitude: addr.latitude ?? null,
          longitude: addr.longitude ?? null,
          googlePlaceId: addr.googlePlaceId ?? null,
          pinConfirmed: addr.pinConfirmed,
          pinCorrected: addr.pinCorrected,
          pinCorrectionNote: addr.pinCorrectionNote ?? null,
          accuracyStatus: addr.accuracyStatus || 'unconfirmed',
          residenceType: addr.residenceType || null,
          ownershipType: addr.ownershipType || null,
        })
        .run();

      // 3. Insert lead
      const leadInsert = tx
        .insert(leads)
        .values({
          customerId: custId,
          eventId: input.eventId || null,
          staffId: null,
          leadStatus: 'new',
          source: 'event',
        })
        .returning({ id: leads.id })
        .all();

      const leadId = leadInsert[0]?.id ?? null;

      // 4. Insert looop_contract
      if (input.monthlyElectricBill || input.wattage || input.billUsageMonth) {
        tx.insert(looopContracts)
          .values({
            customerId: custId,
            leadId,
            monthlyElectricBill,
            wattage,
            billUsageMonth: input.billUsageMonth || null,
            status: 'not_proposed',
          })
          .run();
      }

      // 5. Insert consents. The intake form shows one combined consent checkbox,
      // while downstream solar handoff still reads the dedicated consent type.
      const now = new Date();

      tx.insert(consents)
        .values({
          customerId: custId,
          consentType: 'personal_info_use',
          consentStatus: input.consent.personalInfoConsent ? 'granted' : 'withdrawn',
          consentTextVersion: consentText.version,
          consentedAt: now,
          consentedBy: null,
        })
        .run();

      tx.insert(consents)
        .values({
          customerId: custId,
          consentType: 'solar_partner_share',
          consentStatus: 'granted',
          consentTextVersion: consentText.version,
          consentedAt: now,
          consentedBy: null,
        })
        .run();

      // 6. Audit log
      tx.insert(auditLogs)
        .values({
          action: 'customer.create',
          resourceType: 'customer',
          resourceId: custId,
          diff: { displayId, name: input.name },
        })
        .run();
    });

    return { success: true, customerId };
  } catch (err) {
    const message = err instanceof Error ? err.message : '登録に失敗しました。';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Helper to fetch events for the dropdown
// ---------------------------------------------------------------------------
export async function getActiveEvents() {
  const rows = await db
    .select({
      id: events.id,
      eventName: events.eventName,
      venueName: events.venueName,
      eventDate: events.eventDate,
      status: events.status,
    })
    .from(events)
    .where(and(isNull(events.deletedAt), sql`${events.status} IN ('active', 'scheduled')`))
    .orderBy(events.eventDate);

  return rows;
}

export async function getLatestConsentText(): Promise<ConsentTextForIntake> {
  return resolveLatestConsentText();
}
