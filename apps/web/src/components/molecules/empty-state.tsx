interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border-2 border-dashed border-line px-6 py-10 text-center">
      <p className="text-base font-semibold text-ink-soft">{title}</p>
      {description !== undefined && description !== '' && (
        <p className="mt-2 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}
