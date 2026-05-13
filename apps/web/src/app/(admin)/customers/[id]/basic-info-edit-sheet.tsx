'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateCustomer, type UpdateCustomerInput } from './actions';

interface BasicInfoEditSheetProps {
  customerId: string;
  initialValues: {
    name: string;
    kana: string | null;
    birthDate: string | null;
    memo: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export function BasicInfoEditSheet({
  customerId,
  initialValues,
  open,
  onClose,
}: BasicInfoEditSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialValues.name);
  const [kana, setKana] = useState(initialValues.kana ?? '');
  const [birthDate, setBirthDate] = useState(initialValues.birthDate ?? '');
  const [memo, setMemo] = useState(initialValues.memo ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('お客様名は必須です');
    setError(null);

    const input: UpdateCustomerInput = {
      name: name.trim(),
      kana: kana.trim() || undefined,
      birthDate: birthDate || undefined,
      memo: memo.trim() || undefined,
    };

    startTransition(async () => {
      await updateCustomer(customerId, input);
      router.refresh();
      onClose();
    });
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isPending}>
        キャンセル
      </Button>
      <Button type="submit" form="basic-info-edit-form" variant="primary" size="md" loading={isPending}>
        保存
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title="基本情報を編集" footer={footer}>
      <form id="basic-info-edit-form" onSubmit={handleSave} className="space-y-4">
        {/* お客様名 */}
        <div>
          <label htmlFor="edit-name" className="mb-1 block text-sm font-medium text-text-secondary">
            お客様名
            <span className="ml-1 text-status-error" aria-hidden>*</span>
          </label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田 太郎"
            aria-required="true"
            aria-invalid={error !== null}
            aria-describedby={error !== null ? 'edit-name-error' : undefined}
            invalid={error !== null}
            className="h-9"
            required
          />
          {error !== null && (
            <p id="edit-name-error" className="mt-1 text-xs text-status-error" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* フリガナ */}
        <div>
          <label htmlFor="edit-kana" className="mb-1 block text-sm font-medium text-text-secondary">
            フリガナ
            <span className="ml-1.5 text-xs font-normal text-text-tertiary">(任意)</span>
          </label>
          <Input
            id="edit-kana"
            value={kana}
            onChange={(e) => setKana(e.target.value)}
            placeholder="例: ヤマダ タロウ"
            className="h-9"
          />
        </div>

        {/* 生年月日 */}
        <div>
          <label htmlFor="edit-birth-date" className="mb-1 block text-sm font-medium text-text-secondary">
            生年月日
            <span className="ml-1.5 text-xs font-normal text-text-tertiary">(任意)</span>
          </label>
          <Input
            id="edit-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="h-9 tabular-nums"
          />
        </div>

        {/* メモ */}
        <div>
          <label htmlFor="edit-memo" className="mb-1 block text-sm font-medium text-text-secondary">
            メモ
            <span className="ml-1.5 text-xs font-normal text-text-tertiary">(任意)</span>
          </label>
          <textarea
            id="edit-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            placeholder="備考・特記事項などを入力"
            className="flex w-full resize-y rounded border border-border bg-white px-3 py-2 text-sm placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-bg-muted"
          />
        </div>
      </form>
    </Sheet>
  );
}
