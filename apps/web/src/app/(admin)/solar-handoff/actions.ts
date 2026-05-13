'use server';

import {
  db,
  customers,
  customerAddresses,
  consents,
  leads,
  events,
  users,
  looopContracts,
  partnerHandoffs,
  csvExports,
  auditLogs,
  eq,
  and,
  isNull,
  inArray,
} from '@looop/db';
import { getCurrentUser } from '@looop/auth';
import { revalidatePath } from 'next/cache';

export interface ExportInput {
  customerIds: string[];
  partnerId: string;
  partnerName: string;
}

export interface ExportResult {
  success: boolean;
  csvContent?: string;
  recordCount?: number;
  exportId?: string;
  error?: string;
}

export async function exportSolarCsv(input: ExportInput): Promise<ExportResult> {
  const session = await getCurrentUser();

  try {
    const { customerIds, partnerId, partnerName } = input;

    if (customerIds.length === 0) {
      return { success: false, error: '出力対象を選択してください' };
    }

    // Fetch full data for selected customers
    const rows = await db
      .select({
        id: customers.id,
        displayId: customers.displayId,
        name: customers.name,
        kana: customers.kana,
        phoneEnc: customers.phoneEnc,
        emailEnc: customers.emailEnc,
        birthDate: customers.birthDate,
        postalCode: customerAddresses.postalCode,
        prefecture: customerAddresses.prefecture,
        city: customerAddresses.city,
        street: customerAddresses.street,
        building: customerAddresses.building,
        latitude: customerAddresses.latitude,
        longitude: customerAddresses.longitude,
        staffName: users.displayName,
        eventName: events.eventName,
        eventDate: events.eventDate,
        monthlyElectricBill: looopContracts.monthlyElectricBill,
        wattage: looopContracts.wattage,
        billUsageMonth: looopContracts.billUsageMonth,
        consentedAt: consents.consentedAt,
        consentTextVersion: consents.consentTextVersion,
      })
      .from(customers)
      .innerJoin(
        customerAddresses,
        and(
          eq(customerAddresses.customerId, customers.id),
          eq(customerAddresses.isPrimary, true),
          isNull(customerAddresses.deletedAt),
        ),
      )
      .innerJoin(
        consents,
        and(
          eq(consents.customerId, customers.id),
          eq(consents.consentType, 'solar_partner_share'),
          eq(consents.consentStatus, 'granted'),
          isNull(consents.withdrawnAt),
        ),
      )
      .leftJoin(leads, eq(leads.customerId, customers.id))
      .leftJoin(events, eq(events.id, leads.eventId))
      .leftJoin(users, eq(users.id, leads.staffId))
      .leftJoin(
        looopContracts,
        and(
          eq(looopContracts.customerId, customers.id),
          isNull(looopContracts.deletedAt),
        ),
      )
      .where(
        and(
          isNull(customers.deletedAt),
          inArray(customers.id, customerIds),
        ),
      );

    // Dedupe
    const seen = new Set<string>();
    const selected = rows.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    if (selected.length === 0) {
      return { success: false, error: '対象顧客が見つかりません' };
    }

    const now = new Date();
    const exportId = crypto.randomUUID();

    // Collect consent versions present in this export
    const consentVersions = [...new Set(selected.map((r) => r.consentTextVersion))];

    // Create csv_exports record
    await db.insert(csvExports).values({
      id: exportId,
      exporterUserId: session?.id ?? null,
      exportedAt: now,
      targetPartnerId: partnerId,
      recordCount: selected.length,
      customerIds: selected.map((r) => r.id),
      filterSnapshot: { partnerId, partnerName, consentVersions } as unknown,
    });

    // Create partner_handoffs records
    const handoffValues = selected.map((row) => ({
      customerId: row.id,
      partnerCompanyId: partnerId,
      productType: 'solar' as const,
      sharedItems: ['name', 'phone', 'address', 'consent'] as string[],
      sharedAt: now,
      sharedBy: session?.id ?? null,
      handoffStatus: 'handed_off',
      csvExportId: exportId,
    }));

    await db.insert(partnerHandoffs).values(handoffValues);

    // Audit log
    await db.insert(auditLogs).values({
      actorUserId: session?.id ?? null,
      action: 'csv_export_solar',
      resourceType: 'csv_exports',
      resourceId: exportId,
      diff: JSON.stringify({
        partnerId,
        partnerName,
        recordCount: selected.length,
        exportId,
      }) as unknown,
      createdAt: now,
    });

    // Build CSV content
    const header = [
      '顧客ID',
      '氏名',
      'カナ',
      '電話番号',
      'メールアドレス',
      '生年月日',
      '郵便番号',
      '都道府県',
      '市区町村',
      '丁目番地',
      '建物名',
      '緯度',
      '経度',
      '担当者名',
      '催事名',
      '催事日',
      '月間電気料金',
      'ワット数',
      '明細利用月',
      '同意日時',
      '同意バージョン',
    ];

    const dataRows = selected.map((r) => {
      const consentDate =
        r.consentedAt instanceof Date
          ? r.consentedAt.toISOString()
          : new Date(Number(r.consentedAt) * 1000).toISOString();
      return [
        r.displayId,
        r.name,
        r.kana ?? '',
        r.phoneEnc,
        r.emailEnc ?? '',
        r.birthDate ?? '',
        r.postalCode ?? '',
        r.prefecture ?? '',
        r.city ?? '',
        r.street ?? '',
        r.building ?? '',
        r.latitude != null ? String(r.latitude) : '',
        r.longitude != null ? String(r.longitude) : '',
        r.staffName ?? '',
        r.eventName ?? '',
        r.eventDate ?? '',
        r.monthlyElectricBill != null ? String(r.monthlyElectricBill) : '',
        r.wattage != null ? String(r.wattage) : '',
        r.billUsageMonth ?? '',
        consentDate,
        r.consentTextVersion,
      ];
    });

    const csvLines = [header, ...dataRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    // BOM for Excel compatibility
    const csvContent = '﻿' + csvLines;

    revalidatePath('/solar-handoff');

    return {
      success: true,
      csvContent,
      recordCount: selected.length,
      exportId,
    };
  } catch (err) {
    console.error('exportSolarCsv error:', err);
    return { success: false, error: 'CSV出力に失敗しました' };
  }
}
