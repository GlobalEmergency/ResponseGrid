import type { ReactNode } from 'react';

interface TemplateCardProps {
  name: string;
  description: string;
  dontBringCount: number;
  createdAt: string;
  actions?: ReactNode;
}

/**
 * TemplateCard — displays a summary of an emergency template.
 * Actions slot accepts delete/edit controls (optional).
 */
export function TemplateCard({
  name,
  description,
  dontBringCount,
  createdAt,
  actions,
}: TemplateCardProps) {
  return (
    <article className="flex items-start justify-between gap-4 rounded-lg border-2 border-navy bg-white p-4">
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-sm font-bold text-ink break-words">{name}</h3>
        <p className="text-xs text-muted break-words">{description}</p>
        <p className="text-xs text-muted-soft">
          {dontBringCount} ítems «qué no llevar» · Creada{' '}
          <time dateTime={createdAt} suppressHydrationWarning>
            {new Date(createdAt).toLocaleDateString('es-ES')}
          </time>
        </p>
      </div>
      {actions != null && (
        <div className="flex-shrink-0">{actions}</div>
      )}
    </article>
  );
}
