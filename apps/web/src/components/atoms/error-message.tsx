interface ErrorMessageProps {
  message: string;
}

/**
 * Inline form error banner — aria-live assertive, role alert.
 * Used in all forms that wire a Server Action with useActionState.
 */
export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <p
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
    >
      {message}
    </p>
  );
}
