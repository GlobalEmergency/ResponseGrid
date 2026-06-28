import type { components } from '@reliefhub/api-client';

type OfferItems = components['schemas']['OfferViewDto']['items'];

/**
 * Short human title for an offer built from its supply lines: the first line's
 * name, with a "+N" suffix when the offer carries more than one line.
 */
export function offerTitle(items: OfferItems): string {
  if (items.length === 0) return '—';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} +${items.length - 1}`;
}

/** "name · qty unit" for a single supply line. */
export function lineSummary(item: OfferItems[number]): string {
  const unit =
    typeof item.unit === 'string' && item.unit !== '' ? ` ${item.unit}` : '';
  return `${item.name} · ${item.quantity}${unit}`;
}
