import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Shows a spinner and blocks interaction. Uses `aria-busy` + `aria-disabled`
   * rather than the `disabled` attribute so the button stays focusable and
   * screen readers announce the state change instead of losing the element.
   */
  isLoading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 shadow-sm disabled:bg-brand-300',
  secondary:
    'border border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-text)] hover:bg-[var(--fc-surface-sunken)]',
  ghost: 'text-[var(--fc-text)] hover:bg-[var(--fc-surface-sunken)]',
  danger: 'bg-danger-500 text-white hover:brightness-95',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leadingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const inert = disabled || isLoading;

  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium',
        'transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        isLoading && 'cursor-progress opacity-80',
        fullWidth && 'w-full',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      disabled={disabled}
      aria-disabled={inert || undefined}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Spinner /> : leadingIcon}
      <span>{children}</span>
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
