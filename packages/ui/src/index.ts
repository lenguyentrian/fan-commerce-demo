/**
 * `@fc/ui` — the design system.
 *
 * Rules enforced by review (and by .cursor/rules/30-design-system.mdc):
 *  1. No business logic. Components take data and callbacks, nothing else.
 *  2. No hardcoded colours. Reference tokens from tokens.css.
 *  3. Every interactive component ships keyboard + screen-reader support.
 *  4. No data fetching, no router imports — keeps components portable
 *     and trivially testable.
 */

export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './button';
export { SelectField, TextField, type SelectFieldProps, type TextFieldProps } from './field';
export {
  Alert,
  EmptyState,
  Skeleton,
  type AlertProps,
  type AlertTone,
  type EmptyStateProps,
  type SkeletonProps,
} from './feedback';
export {
  Badge,
  Card,
  Stack,
  type BadgeProps,
  type BadgeTone,
  type CardProps,
  type StackProps,
} from './surface';
export { QuantityStepper, type QuantityStepperProps } from './quantity-stepper';
export { Price, type PriceProps } from './price';
