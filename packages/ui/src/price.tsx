import { formatMoney, type Money } from '@fc/core';
import { clsx } from 'clsx';

export interface PriceProps {
  value: Money;
  compareAt?: Money | null;
  locale?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

/**
 * Renders a price, and a struck-through original when discounted.
 *
 * `<s>` carries semantic meaning but screen readers do not announce it
 * consistently, so the original price gets an explicit sr-only prefix.
 */
export function Price({ value, compareAt, locale = 'vi-VN', className, size = 'md' }: PriceProps) {
  const showCompare = compareAt != null && compareAt.amount > value.amount;

  return (
    <span className={clsx('inline-flex flex-wrap items-baseline gap-2', className)}>
      <span className={clsx('font-semibold text-[var(--fc-text)]', SIZES[size])}>
        {formatMoney(value, locale)}
      </span>
      {showCompare ? (
        <>
          <span className="sr-only">Giá gốc</span>
          <s className="text-sm text-[var(--fc-text-muted)]">{formatMoney(compareAt, locale)}</s>
        </>
      ) : null}
    </span>
  );
}
