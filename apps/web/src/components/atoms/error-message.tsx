interface ErrorMessageProps {
  message: string;
}

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
