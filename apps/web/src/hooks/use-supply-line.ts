'use client';

import { useCallback, useState } from 'react';
import type { SupplyLine } from '@/domain/supplies/supply-line';
import { deriveFromSupply } from '@/domain/supplies/supply-line';
import { resolveLineMode, type LineMode } from '@/domain/supplies/line-mode';
import type { Category } from '@/domain/supplies/category';
import type { CatalogueSupply } from '@/domain/supplies/catalogue-supply';

/**
 * Headless controller for one supply line. Holds the transient `committed`
 * flag (did the user leave the name field on free text?) and derives the
 * display `mode` via the pure `resolveLineMode`. On catalogue selection it
 * applies `deriveFromSupply` (name/supplyId + material-only category + unit).
 * The parent owns the `SupplyLine` value and applies patches via `onChange`.
 */
export function useSupplyLine(params: {
  value: SupplyLine;
  categories: readonly Category[];
  onChange: (patch: Partial<SupplyLine>) => void;
}) {
  const { value, categories, onChange } = params;
  const [committed, setCommitted] = useState(false);

  const onTextChange = useCallback(
    (name: string) => {
      setCommitted(false);
      onChange({ name, supplyId: null });
    },
    [onChange],
  );

  const onSelect = useCallback(
    (supply: CatalogueSupply) => {
      setCommitted(false);
      onChange(deriveFromSupply(supply, categories));
    },
    [onChange, categories],
  );

  const onBlur = useCallback(() => {
    if (value.supplyId === null && value.name.trim() !== '') {
      setCommitted(true);
    }
  }, [value.supplyId, value.name]);

  const mode: LineMode = resolveLineMode(value.supplyId, value.name, committed);

  return {
    mode,
    showCategory: mode === 'free',
    showUnit: mode === 'free',
    showExpiry: mode === 'free',
    selector: {
      name: value.name,
      supplyId: value.supplyId,
      onTextChange,
      onSelect,
      onBlur,
    },
  };
}
