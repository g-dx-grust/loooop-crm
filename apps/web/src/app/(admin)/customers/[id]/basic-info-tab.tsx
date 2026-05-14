'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BasicInfoEditSheet } from './basic-info-edit-sheet';

interface BasicInfoTabProps {
  customerId: string;
  customer: {
    name: string;
    kana: string | null;
    phoneEnc: string;
    phoneSubEnc: string | null;
    emailEnc: string | null;
    birthDate: string | null;
    memo: string | null;
    currentMobileCarrier?: string | null;
    currentWifiCarrier?: string | null;
  };
  maskedPhone: string;
  maskedPhoneSub: string | null;
}

export function BasicInfoTab({
  customerId,
  customer,
  maskedPhone,
  maskedPhoneSub,
}: BasicInfoTabProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setEditOpen(true)}
          className="gap-1.5"
        >
          <Pencil size={14} aria-hidden />
          編集
        </Button>
      </div>

      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-text-secondary">お客様名</dt>
        <dd className="font-medium text-text-primary">{customer.name}</dd>

        {customer.kana ? (
          <>
            <dt className="text-text-secondary">フリガナ</dt>
            <dd className="text-text-primary">{customer.kana}</dd>
          </>
        ) : null}

        <dt className="text-text-secondary">電話番号</dt>
        <dd className="tabular-nums text-text-primary">{maskedPhone}</dd>

        {maskedPhoneSub ? (
          <>
            <dt className="text-text-secondary">サブ電話番号</dt>
            <dd className="tabular-nums text-text-primary">{maskedPhoneSub}</dd>
          </>
        ) : null}

        {customer.emailEnc ? (
          <>
            <dt className="text-text-secondary">メールアドレス</dt>
            <dd className="text-text-primary">{customer.emailEnc}</dd>
          </>
        ) : null}

        {customer.birthDate ? (
          <>
            <dt className="text-text-secondary">生年月日</dt>
            <dd className="tabular-nums text-text-primary">{customer.birthDate}</dd>
          </>
        ) : null}

        {customer.currentMobileCarrier ? (
          <>
            <dt className="text-text-secondary">使用中キャリア</dt>
            <dd className="text-text-primary">{customer.currentMobileCarrier}</dd>
          </>
        ) : null}

        {customer.currentWifiCarrier ? (
          <>
            <dt className="text-text-secondary">使用中Wi-Fi</dt>
            <dd className="text-text-primary">{customer.currentWifiCarrier}</dd>
          </>
        ) : null}

        {customer.memo ? (
          <>
            <dt className="text-text-secondary">メモ</dt>
            <dd className="whitespace-pre-wrap text-text-primary">{customer.memo}</dd>
          </>
        ) : null}
      </dl>

      <BasicInfoEditSheet
        customerId={customerId}
        initialValues={{
          name: customer.name,
          kana: customer.kana,
          birthDate: customer.birthDate,
          memo: customer.memo,
          currentMobileCarrier: customer.currentMobileCarrier ?? null,
          currentWifiCarrier: customer.currentWifiCarrier ?? null,
        }}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
