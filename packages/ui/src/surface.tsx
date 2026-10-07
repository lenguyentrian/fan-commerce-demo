import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

/**
 * `as` is restricted to a handful of block-level tags rather than being fully
 * polymorphic. Full polymorphism needs generics that leak into every call
 * site; four tags cover every use in the app and keep the props readable.
 * Attributes are typed against HTMLElement so the union stays assignable.
 */
export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'section' | 'li';
  padded?: boolean;
}

export function Card({ as: Tag = 'div', padded = true, className, ...rest }: CardProps) {
  return (
    <Tag
      className={clsx(
        'rounded-[var(--radius-card)] border border-[var(--fc-border)] bg-[var(--fc-surface)]',
        padded && 'p-4 sm:p-5',
        className,
      )}
      {...rest}
    />
  );
}

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--fc-surface-sunken)] text-[var(--fc-text-muted)]',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-[color:var(--color-success-500)]',
  warning: 'bg-warning-50 text-[color:var(--color-warning-500)]',
  danger: 'bg-danger-50 text-danger-500',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 1 | 2 | 3 | 4 | 6 | 8;
}

const GAP: Record<NonNullable<StackProps['gap']>, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

export function Stack({ gap = 4, className, ...rest }: StackProps) {
  return <div className={clsx('flex flex-col', GAP[gap], className)} {...rest} />;
}
