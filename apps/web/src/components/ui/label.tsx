import { cn } from '@/lib/cn';
import type { LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label className={cn('block text-sm font-medium text-text-primary', className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-status-error">*</span> : null}
    </label>
  );
}
