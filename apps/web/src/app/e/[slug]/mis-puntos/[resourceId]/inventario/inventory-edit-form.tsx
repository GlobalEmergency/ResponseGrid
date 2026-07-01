'use client';

import { useActionState } from 'react';
import type { components } from '@reliefhub/api-client';
import type { InventoryState } from './actions';
import { InventoryField } from '../../../registrar/inventory-field';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import type { SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';
import type { Messages } from '@/i18n/messages/es';

type SupplyLineView = components['schemas']['SupplyLineResponseDto'];

const INITIAL_STATE: InventoryState = { status: 'idle' };

type BoundAction = (
  prev: InventoryState,
  formData: FormData,
) => Promise<InventoryState>;

interface InventoryEditFormProps {
  action: BoundAction;
  initial: SupplyLineView[];
  t: Messages['registrar'];
  ta: Messages['account'];
  locale: 'es' | 'en';
  categories: readonly Category[];
}

const toLine = (l: SupplyLineView): SupplyLine => ({
  name: l.name,
  supplyId: l.supplyId,
  quantity: l.quantity,
  unit: l.unit ?? '',
  category: l.category,
  ...(l.expiresAt ? { expiresAt: l.expiresAt } : {}),
});

export function InventoryEditForm({
  action,
  initial,
  t,
  ta,
  locale,
  categories,
}: InventoryEditFormProps) {
  const [state, formAction, pending] = useActionState<InventoryState, FormData>(
    action,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-lg border-2 border-navy bg-white p-4 text-sm font-semibold text-ink"
        >
          {ta.inventory_saved_success}
        </p>
      )}
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      <InventoryField
        t={t}
        locale={locale}
        categories={categories}
        initialLines={initial.map(toLine)}
      />

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? ta.inventory_saving : ta.inventory_save_cta}
      </Button>
    </form>
  );
}
