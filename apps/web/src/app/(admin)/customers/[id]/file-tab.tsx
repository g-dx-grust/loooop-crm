// Pure display, no 'use client' needed
import { FileText, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { FileRow } from '@looop/db';

interface FileTabProps {
  fileItems: FileRow[];
}

const FILE_TYPE_LABELS: Record<string, string> = {
  electric_bill: '電気料金明細',
  contract: '契約書',
  id_photo: '身分証写真',
  other: 'その他',
};

function isImageMime(mimeType: string | null | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

function formatSizeKb(sizeBytes: number | null | undefined): string {
  if (sizeBytes === null || sizeBytes === undefined) return '—';
  const kb = sizeBytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

export function FileTab({ fileItems }: FileTabProps) {
  if (fileItems.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-text-tertiary">
        <FileText className="mx-auto mb-2 size-8 text-text-tertiary" aria-hidden />
        <p>ファイルはありません</p>
        <p className="mt-1 text-xs">電気料金明細などをアップロードできます（準備中）</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {fileItems.map((file) => (
        <li
          key={file.id}
          className="flex items-center gap-3 rounded border border-border bg-white p-3 hover:bg-bg-subtle"
        >
          {/* アイコン */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded bg-bg-muted text-text-tertiary">
            {isImageMime(file.mimeType) ? (
              <ImageIcon className="size-5" aria-hidden />
            ) : (
              <FileText className="size-5" aria-hidden />
            )}
          </div>

          {/* ファイル情報 */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {FILE_TYPE_LABELS[file.fileType] ?? file.fileType}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-text-tertiary">
              {formatSizeKb(file.sizeBytes)}
              {file.uploadedAt
                ? ` · ${format(new Date(file.uploadedAt), 'yyyy/MM/dd HH:mm')}`
                : ''}
            </p>
          </div>

          {/* ダウンロードリンク */}
          <a
            href={file.blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-brand-primary hover:underline"
          >
            開く
          </a>
        </li>
      ))}
    </ul>
  );
}
