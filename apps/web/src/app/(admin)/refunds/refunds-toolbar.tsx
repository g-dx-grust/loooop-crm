'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefundFormSheet } from './refund-form-sheet';

interface CustomerOption { id: string; name: string }

export function RefundsToolbar({ customers }: { customers: CustomerOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="md" onClick={() => setOpen(true)}>返還を登録</Button>
      <RefundFormSheet open={open} onClose={() => setOpen(false)} customers={customers} />
    </>
  );
}
