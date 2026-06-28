import type { ReactNode } from 'react';
import { Label } from '@/components/atoms/label';

interface FormFieldProps {
  /** htmlFor value — must match the control's id. */
  htmlFor: string;
  label: ReactNode;
  /** The actual form control (Input, Textarea, Select…) */
  children: ReactNode;
  /** Optional error text shown below the control. */
  error?: string;
  /** Replaces <label> with a <p> — needed when the control is not a single element (e.g. the LocationPicker group). */
  labelAs?: 'label' | 'p';
}

/**
 * FormField — Label + control + optional error message.
 *
 * Encapsulates the `flex flex-col gap-2` wrapper + label style that repeats
 * in every form field across the app.
 */
export function FormField({
  htmlFor,
  label,
  children,
  error,
  labelAs = 'label',
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {labelAs === 'label' ? (
        <Label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-ink uppercase tracking-wide"
        >
          {label}
        </Label>
      ) : (
        <p className="text-sm font-semibold text-ink uppercase tracking-wide">
          {label}
        </p>
      )}
      {children}
      {error !== undefined && error !== '' && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
