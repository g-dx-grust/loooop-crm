'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApplicationFormSheet } from './application-form-sheet';

interface CustomerOption {
  id: string;
  name: string;
}

interface Props {
  customers: CustomerOption[];
}

export function LooopActionsBar({ customers }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Link href="/kpi">
        <Button variant="secondary" size="md">
          売上集計
        </Button>
      </Link>
      <Button size="md" onClick={() => setOpen(true)}>
        申込登録
      </Button>
      <ApplicationFormSheet open={open} onClose={() => setOpen(false)} customers={customers} />
    </div>
  );
}
