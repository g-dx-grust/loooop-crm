import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-8 w-full rounded border border-border bg-white px-3 py-1 text-sm placeholder:text-text-tertiary',
        'focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-0',
        'disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-text-disabled',
        invalid && 'border-status-error focus-visible:border-status-error',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
