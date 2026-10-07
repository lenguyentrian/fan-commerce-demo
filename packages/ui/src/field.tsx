'use client';

import { clsx } from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
}

/**
 * Wraps a control with a real <label>, an optional hint and an error message.
 *
 * The wiring (`htmlFor`, `aria-describedby`, `aria-invalid`, `role="alert"`) is
 * the part that is easy to forget and easy to get wrong, so it lives here once
 * instead of in every form.
 */
function FieldShell({ label, hint, error, required, children }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--fc-text)]">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-danger-500">
              *
            </span>
            <span className="sr-only"> (bắt buộc)</span>
          </>
        ) : null}
      </label>

      {children({ inputId, describedBy })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-[var(--fc-text-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL_CLASSES =
  'h-11 w-full rounded-[var(--radius-control)] border bg-[var(--fc-surface)] px-3 text-sm text-[var(--fc-text)] placeholder:text-[var(--fc-text-muted)] transition-colors';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, className, required, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      {({ inputId, describedBy }) => (
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={clsx(
            CONTROL_CLASSES,
            error ? 'border-danger-500' : 'border-[var(--fc-border)]',
            className,
          )}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function SelectField({
  label,
  hint,
  error,
  options,
  className,
  required,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      {({ inputId, describedBy }) => (
        <select
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={clsx(
            CONTROL_CLASSES,
            error ? 'border-danger-500' : 'border-[var(--fc-border)]',
            className,
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
