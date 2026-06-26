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
      className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {message}
    </p>
  );
}
