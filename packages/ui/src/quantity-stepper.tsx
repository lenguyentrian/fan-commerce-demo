'use client';

import { clsx } from 'clsx';
import { useId } from 'react';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  /** Used to build an accessible name, e.g. "Số lượng Tour Tee, size M". */
  itemLabel: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible quantity control.
 *
 * Why not a bare `<input type="number">`: on mobile Safari the spinner is
 * unusable and the keyboard lets users paste "1e9". This keeps a real input
 * for screen readers and keyboard entry, but clamps every change to
 * [min, max] in one place.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  itemLabel,
  disabled = false,
  className,
}: QuantityStepperProps) {
  const inputId = useId();
  const clamp = (next: number) => Math.min(Math.max(next, min), max);

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-[var(--radius-control)] border border-[var(--fc-border)]',
        disabled && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        className="grid size-10 place-items-center text-lg leading-none disabled:opacity-40"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || atMin}
        aria-label={`Giảm số lượng ${itemLabel}`}
      >
        <span aria-hidden="true">−</span>
      </button>

      <label htmlFor={inputId} className="sr-only">
        {`Số lượng ${itemLabel}`}
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        className="h-10 w-12 border-x border-[var(--fc-border)] bg-transparent text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (Number.isNaN(parsed)) return;
          onChange(clamp(parsed));
        }}
      />

      <button
        type="button"
        className="grid size-10 place-items-center text-lg leading-none disabled:opacity-40"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || atMax}
        aria-label={`Tăng số lượng ${itemLabel}`}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
