'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createShipment } from './actions';
import { Button } from '@/components/atoms/button';
import { Select } from '@/components/atoms/select';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { DetailDrawer } from '@/components/organisms/detail-drawer';
import { SupplyLineList } from '@/components/organisms/supply-line-list';
import { emptyLine, toDto, isComplete, type SupplyLine } from '@/domain/supplies/supply-line';
import type { Category } from '@/domain/supplies/category';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

export interface ResourceOption {
  id: string;
  name: string;
}

interface CreateShipmentProps {
  emergencyId: string;
  slug: string;
  resources: ResourceOption[];
  categories: readonly Category[];
}

/**
 * The loose lines use the shared material model (#141); loading trackable
 * containers (#140) onto a shipment is a separate flow, not part of this form.
 */
export function CreateShipment({
  emergencyId,
  slug,
  resources,
  categories,
}: CreateShipmentProps) {
  const locale = useLocale();
  const tc = getMessages(locale).coord;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultCategory = categories[0]?.slug ?? '';

  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [lines, setLines] = useState<SupplyLine[]>([emptyLine(defaultCategory)]);
  const [manifest, setManifest] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const labels = {
    nameLabel: tc.ship_item_description_label,
    namePlaceholder: tc.ship_item_description_placeholder,
    quantityLabel: tc.ship_item_quantity_label,
    unitLabel: tc.ship_item_unit_label,
    unitPlaceholder: tc.ship_item_unit_placeholder,
    categoryLabel: tc.ship_item_category_label,
    addItem: tc.ship_item_add,
    itemRemoveLabel: tc.ship_item_remove,
    legend: tc.ship_items_legend,
  };

  function reset() {
    setOriginId('');
    setDestinationId('');
    setLines([emptyLine(defaultCategory)]);
    setManifest('');
    setError(undefined);
  }

  function handleSubmit() {
    setError(undefined);

    const items = lines.filter(isComplete).map(toDto);

    if (items.length === 0) {
      setError(tc.ship_err_items_required);
      return;
    }

    startTransition(async () => {
      const result = await createShipment(emergencyId, slug, {
        originResourceId: originId,
        destinationResourceId: destinationId,
        items,
        ...(manifest.trim() !== '' ? { manifest: manifest.trim() } : {}),
      });
      if (result.status === 'success') {
        reset();
        setOpen(false);
        router.refresh();
      } else if (result.status === 'error') {
        setError(result.message);
      }
    });
  }

  const footer = (
    <div className="flex flex-col gap-3">
      {error !== undefined && <ErrorMessage message={error} />}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        fullWidth
        size="lg"
      >
        {pending ? tc.ship_creating : tc.ship_create_submit}
      </Button>
    </div>
  );

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} variant="secondary">
        {tc.ship_create_cta}
      </Button>

      {open && (
        <DetailDrawer
          open={open}
          onClose={() => setOpen(false)}
          title={tc.ship_create_title}
          footer={footer}
        >
          <div className="flex flex-col gap-5">
            <FormField
              htmlFor="ship-origin"
              label={
                <>
                  {tc.ship_field_origin} <span aria-hidden="true">*</span>
                </>
              }
            >
              <Select
                id="ship-origin"
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
              >
                <option value="" disabled>
                  {tc.ship_select_resource_placeholder}
                </option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              htmlFor="ship-destination"
              label={
                <>
                  {tc.ship_field_destination} <span aria-hidden="true">*</span>
                </>
              }
            >
              <Select
                id="ship-destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              >
                <option value="" disabled>
                  {tc.ship_select_resource_placeholder}
                </option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <SupplyLineList
              value={lines}
              onChange={setLines}
              categories={categories}
              locale={locale}
              idPrefix="ship"
              required
              defaultCategory={defaultCategory}
              labels={labels}
            />

            <FormField
              htmlFor="ship-manifest"
              label={
                <>
                  {tc.ship_field_manifest}{' '}
                  <span className="text-muted-soft font-normal normal-case">
                    {tc.optional}
                  </span>
                </>
              }
            >
              <Textarea
                id="ship-manifest"
                rows={3}
                placeholder={tc.ship_manifest_placeholder}
                value={manifest}
                onChange={(e) => setManifest(e.target.value)}
              />
            </FormField>
          </div>
        </DetailDrawer>
      )}
    </>
  );
}
