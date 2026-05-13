import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const toneStyle: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  success: { bg: 'bg-status-successSoft', fg: 'text-status-success', dot: 'bg-status-success' },
  warning: { bg: 'bg-status-warningSoft', fg: 'text-status-warning', dot: 'bg-status-warning' },
  error:   { bg: 'bg-status-errorSoft',   fg: 'text-status-error',   dot: 'bg-status-error' },
  info:    { bg: 'bg-status-infoSoft',    fg: 'text-status-info',    dot: 'bg-status-info' },
  neutral: { bg: 'bg-status-neutralSoft', fg: 'text-text-secondary', dot: 'bg-status-neutral' },
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  withDot?: boolean;
}

export function Badge({ tone = 'neutral', withDot = true, className, children, ...props }: BadgeProps) {
  const { bg, fg, dot } = toneStyle[tone];
  return (
    <span className={cn('badge', bg, fg, className)} {...props}>
      {withDot ? <span className={cn('badge-dot', dot)} aria-hidden /> : null}
      {children}
    </span>
  );
}
