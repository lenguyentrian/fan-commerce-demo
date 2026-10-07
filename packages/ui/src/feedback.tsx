import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-success-50 text-[color:var(--color-success-500)] border-success-50',
  warning: 'bg-warning-50 text-[color:var(--color-warning-500)] border-warning-50',
  danger: 'bg-danger-50 text-danger-500 border-danger-50',
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Actionable errors get a retry affordance rather than a dead end. */
  action?: ReactNode;
}

export function Alert({ tone = 'info', title, children, className, action }: AlertProps) {
  return (
    <div
      // Errors must interrupt; informational messages must not.
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      className={clsx(
        'flex flex-col gap-2 rounded-[var(--radius-control)] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
  /** Describes what is loading, for assistive tech. */
  label?: string;
}

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={clsx('animate-pulse rounded-[var(--radius-control)] bg-[var(--fc-surface-sunken)]', className)}
    >
      <span className="sr-only">{label ?? 'Đang tải'}</span>
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--fc-border)] px-6 py-14 text-center">
      {icon ? (
        <div aria-hidden="true" className="text-[var(--fc-text-muted)]">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-[var(--fc-text)]">{title}</h2>
      {description ? (
        <p className="max-w-sm text-sm text-[var(--fc-text-muted)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
