'use client';

import { useActionState, useState } from 'react';
import { matchOffer, fulfillOffer, cancelOffer } from '@/app/e/[slug]/coordinacion/actions';
import type { components } from '@reliefhub/api-client';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';

type OfferViewDto = components['schemas']['OfferViewDto'];
type NeedViewDto = components['schemas']['NeedViewDto'];

const CATEGORY_LABELS: Record<OfferViewDto['category'], string> = {
  hygiene: 'Higiene',
  water: 'Agua',
  food: 'Alimentos',
  medical: 'Sanitario',
  shelter: 'Refugio',
  tools: 'Herramientas',
  other: 'Otro',
  medicines: '💊 Medicamentos',
  medical_equipment: '🩺 Equipos médicos',
  medical_supplies: '📦 Insumos médicos',
  medical_personnel: '🧑‍⚕️ Personal sanitario',
};

const STATUS_BADGE: Record<
  OfferViewDto['status'],
  'offer-open' | 'offer-matched' | 'offer-fulfilled' | 'offer-cancelled'
> = {
  open: 'offer-open',
  matched: 'offer-matched',
  fulfilled: 'offer-fulfilled',
  cancelled: 'offer-cancelled',
};

const STATUS_LABELS: Record<OfferViewDto['status'], string> = {
  open: 'Abierta',
  matched: 'Asignada',
  fulfilled: 'Entregada',
  cancelled: 'Cancelada',
};

const INITIAL_STATE: ActionResult = { status: 'idle' };

interface CoordinationOfferCardProps {
  offer: OfferViewDto;
  /** Validated needs available to match against (for general offers). */
  validatedNeeds: NeedViewDto[];
  slug: string;
}

export function CoordinationOfferCard({
  offer,
  validatedNeeds,
  slug,
}: CoordinationOfferCardProps) {
  const [selectedNeedId, setSelectedNeedId] = useState('');

  // Single action state — we switch which server action to call based on form submission
  const [matchState, matchFormAction, matchPending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => {
      const needId =
        typeof offer.targetNeedId === 'string' && offer.targetNeedId !== ''
          ? offer.targetNeedId
          : selectedNeedId;
      if (needId === '') {
        return { status: 'error', message: 'Selecciona una necesidad para asignar.' };
      }
      return matchOffer(offer.id, needId, slug);
    },
    INITIAL_STATE,
  );

  const [fulfillState, fulfillFormAction, fulfillPending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => fulfillOffer(offer.id, slug),
    INITIAL_STATE,
  );

  const [cancelState, cancelFormAction, cancelPending] = useActionState<ActionResult, FormData>(
    async (_prev, _formData) => cancelOffer(offer.id, slug),
    INITIAL_STATE,
  );

  // Determine the active error (at most one action runs at a time)
  const errorMessage =
    (matchState.status === 'error' ? matchState.message : undefined) ??
    (fulfillState.status === 'error' ? fulfillState.message : undefined) ??
    (cancelState.status === 'error' ? cancelState.message : undefined);

  // Collapse card when fulfilled or cancelled via action
  if (
    fulfillState.status === 'success' ||
    cancelState.status === 'success'
  ) {
    return null;
  }

  const isDirected =
    typeof offer.targetNeedId === 'string' && offer.targetNeedId !== '';

  const unit =
    typeof offer.unit === 'string' && offer.unit !== '' ? offer.unit : null;

  return (
    <article
      aria-label={`Oferta: ${offer.description}`}
      className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-ink leading-tight break-words">
            {offer.description}
          </h3>
          <Badge variant={STATUS_BADGE[offer.status]}>
            {STATUS_LABELS[offer.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted">
          <span className="font-medium">{CATEGORY_LABELS[offer.category]}</span>
          <span aria-hidden="true" className="text-muted-soft">·</span>
          <span>
            {offer.quantity}
            {unit !== null ? ` ${unit}` : ''}
          </span>
          <span aria-hidden="true" className="text-muted-soft">·</span>
          <span className="truncate max-w-[200px]">{offer.location.address}</span>
        </div>

        {/* Directed need indicator */}
        {isDirected && (
          <p className="text-xs text-amber-700 font-medium">
            Oferta dirigida a una necesidad específica
          </p>
        )}
      </div>

      {/* Error */}
      {errorMessage !== undefined && (
        <ErrorMessage message={errorMessage} />
      )}

      {/* Actions */}
      {offer.status === 'open' && (
        <div className="flex flex-col gap-3">
          {/* Match action */}
          <form action={matchFormAction} className="flex flex-col gap-2">
            {!isDirected && validatedNeeds.length > 0 && (
              <Select
                id={`need-select-${offer.id}`}
                name="needId"
                aria-label="Seleccionar necesidad para asignar"
                value={selectedNeedId}
                onChange={(e) => setSelectedNeedId(e.target.value)}
              >
                <option value="" disabled>
                  Selecciona una necesidad…
                </option>
                {validatedNeeds.map((need) => (
                  <option key={need.id} value={need.id}>
                    {need.title}
                  </option>
                ))}
              </Select>
            )}
            <Button
              type="submit"
              disabled={matchPending || (!isDirected && selectedNeedId === '')}
              fullWidth
              size="md"
            >
              {matchPending
                ? 'Procesando…'
                : isDirected
                  ? 'Confirmar asignación a la necesidad dirigida'
                  : 'Asignar a necesidad'}
            </Button>
          </form>

          {/* Cancel action */}
          <form action={cancelFormAction}>
            <Button
              type="submit"
              disabled={cancelPending}
              fullWidth
              size="md"
              variant="danger-outline"
            >
              {cancelPending ? 'Cancelando…' : 'Cancelar oferta'}
            </Button>
          </form>
        </div>
      )}

      {offer.status === 'matched' && (
        <div className="flex flex-col gap-3">
          <form action={fulfillFormAction}>
            <Button
              type="submit"
              disabled={fulfillPending}
              fullWidth
              size="md"
            >
              {fulfillPending ? 'Procesando…' : 'Marcar como entregada'}
            </Button>
          </form>
          <form action={cancelFormAction}>
            <Button
              type="submit"
              disabled={cancelPending}
              fullWidth
              size="md"
              variant="danger-outline"
            >
              {cancelPending ? 'Cancelando…' : 'Cancelar oferta'}
            </Button>
          </form>
        </div>
      )}
    </article>
  );
}
