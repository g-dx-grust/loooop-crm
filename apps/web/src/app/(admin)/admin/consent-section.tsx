'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { createConsentVersion } from './actions';
import type { ConsentVersionRow } from './queries';

interface ConsentSectionProps {
  initialVersions: ConsentVersionRow[];
}

function defaultVersion() {
  const today = new Date();
  const ymd = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');
  return `v${ymd}-combined`;
}

export function ConsentSection({ initialVersions }: ConsentSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [version, setVersion] = useState(defaultVersion());
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const combinedVersions = useMemo(
    () => initialVersions.filter((row) => row.consentType === 'combined_personal_solar'),
    [initialVersions],
  );
  const latest = combinedVersions[0] ?? null;

  function closeSheet() {
    setSheetOpen(false);
    setVersion(defaultVersion());
    setBody('');
    setError('');
  }

  function handleSave() {
    if (!version.trim()) {
      setError('バージョンを入力してください');
      return;
    }
    if (!body.trim()) {
      setError('同意文を入力してください');
      return;
    }

    setError('');
    startTransition(async () => {
      const result = await createConsentVersion({ version, body });
      if (result.success) {
        window.location.reload();
      } else {
        setError(result.error ?? '保存に失敗しました');
      }
    });
  }

  return (
    <div id="consent-texts" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h1 text-text-primary">同意文</h2>
        <Button onClick={() => setSheetOpen(true)} size="md">
          <Plus className="size-4" />
          同意文を追加
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">現在の同意文</h3>
            {latest ? <Badge tone="info">{latest.version}</Badge> : null}
          </div>
        </div>
        <div className="px-5 py-4">
          {latest ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {latest.body}
            </p>
          ) : (
            <p className="text-sm text-text-tertiary">同意文が登録されていません</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle text-xs text-text-secondary">
              <th className="h-9 px-4 text-left font-medium">バージョン</th>
              <th className="h-9 px-4 text-left font-medium">種別</th>
              <th className="h-9 px-4 text-left font-medium">適用開始</th>
              <th className="h-9 px-4 text-left font-medium">本文</th>
            </tr>
          </thead>
          <tbody>
            {initialVersions.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs tabular-nums text-text-primary">{row.version}</td>
                <td className="px-4 py-3 text-xs text-text-secondary">{row.consentType}</td>
                <td className="px-4 py-3 text-xs tabular-nums text-text-secondary">
                  {row.effectiveFrom ? new Date(row.effectiveFrom).toLocaleDateString('ja-JP') : '—'}
                </td>
                <td className="max-w-xl px-4 py-3 text-xs text-text-secondary">
                  <span className="line-clamp-2">{row.body}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title="同意文を追加"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSheet}>
              キャンセル
            </Button>
            <Button onClick={handleSave} loading={isPending}>
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="consent-version" required>
              バージョン
            </Label>
            <Input
              id="consent-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v20260513-combined"
            />
          </div>
          <div>
            <Label htmlFor="consent-body" required>
              同意文
            </Label>
            <textarea
              id="consent-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="個人情報の取得・利用および太陽光関連の情報提供に関する同意文を入力"
              className="mt-1 w-full rounded border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:border-brand-primary focus-visible:outline-none"
            />
          </div>
          {error ? (
            <p className="text-xs text-status-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}
