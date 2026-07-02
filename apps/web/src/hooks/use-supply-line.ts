'use client';

import { useCallback, useState } from 'react';
import type { SupplyLine } from '@/domain/supplies/supply-line';
import { deriveFromSupply } from '@/domain/supplies/supply-line';
import { resolveLineMode, type LineMode } from '@/domain/supplies/line-mode';
import type { Category } from '@/domain/supplies/category';
import type { CatalogueSupply } from '@/domain/supplies/catalogue-supply';

/**
 * Headless controller for one supply line. Holds the transient `editing` flag
 * (is the user mid-typing a free-text name?) and derives the display `mode`
 * via the pure `resolveLineMode` (committed = not editing). On catalogue
 * selection it applies `deriveFromSupply` (name/supplyId + material-only
 * category + unit). The parent owns the `SupplyLine` value and applies patches
 * via `onChange`.
 */
export function useSupplyLine(params: {
  value: SupplyLine;
  categories: readonly Category[];
  onChange: (patch: Partial<SupplyLine>) => void;
}) {
  const { value, categories, onChange } = params;
  // `editing` = the user is re-typing the name and has not left the field yet,
  // so the manual fields stay collapsed until blur (the catalogue selector can
  // still take over). Deliberately the INVERSE of a `committed` flag: rows are
  // keyed by index, so removing a sibling shifts values across component
  // instances, and the safe default for a line that already carries a
  // free-text name (prefilled or shifted-in) is to show its manual fields.
  const [editing, setEditing] = useState(false);

  const onTextChange = useCallback(
    (name: string) => {
      setEditing(true);
      onChange({ name, supplyId: null });
    },
    [onChange],
  );

  const onSelect = useCallback(
    (supply: CatalogueSupply) => {
      setEditing(false);
      onChange(deriveFromSupply(supply, categories));
    },
    [onChange, categories],
  );

  const onBlur = useCallback(() => {
    setEditing(false);
  }, []);

  const mode: LineMode = resolveLineMode(value.supplyId, value.name, !editing);

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
