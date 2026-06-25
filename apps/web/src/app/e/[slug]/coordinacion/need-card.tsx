'use client';

import { useActionState } from 'react';
import { validateNeed } from './actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from './actions';

type NeedView = components['schemas']['NeedViewDto'];
type ItemCategory = components['schemas']['NeedItemResponseDto']['category'];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  hygiene: 'Higiene',
  water: 'Agua',
  food: 'Alimentos',
  medical: 'Sanitario',
  shelter: 'Refugio',
  tools: 'Herramientas',
  other: 'Otro',
};

const PRIORITY_LABELS: Record<NeedView['priority'], string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface NeedCardProps {
  need: NeedView;
  slug: string;
}

export function NeedCard({ need, slug }: NeedCardProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => {
      return validateNeed(need.id, slug);
    },
    INITIAL_STATE,
  );

  if (state.status === 'success') {
    return null;
  }

  return (
    <article
      aria-label={`Petición: ${need.title}`}
      className="flex flex-col gap-4 rounded-lg border-2 border-gray-900 bg-white p-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-gray-900 leading-tight break-words">
          {need.title}
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {need.items[0] !== undefined && (
            <span className="font-medium">
              {CATEGORY_LABELS[need.items[0].category]}
            </span>
          )}
          <span aria-hidden="true" className="text-gray-300">·</span>
          <span>Prioridad: {PRIORITY_LABELS[need.priority]}</span>
          {need.items.length > 0 && (
            <>
              <span aria-hidden="true" className="text-gray-300">·</span>
              <span>
                {String(need.items[0]?.quantity ?? '')}
                {need.items[0]?.unit != null ? ` ${String(need.items[0].unit)}` : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {state.status === 'error' && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {state.message}
        </p>
      )}

      {/* Validate form */}
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Procesando…' : 'Validar'}
        </button>
      </form>
    </article>
  );
}
