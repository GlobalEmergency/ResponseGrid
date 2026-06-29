'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Persists and restores a form draft in localStorage.
 *
 * - On mount, if a non-empty draft exists the setters are called and
 *   `wasRestored` transitions to `true`.
 * - On every values change the draft is updated in localStorage (debounced).
 * - Call `clearDraft()` after a successful server-action submit.
 *
 * @param key     Unique key for this form (scoped with "rh-draft:" prefix).
 * @param values  The current controlled values (must be serialisable strings).
 * @param setters Matching setters for each key in `values`.
 * @param opts    Optional `{ debounce }` in ms (default 600).
 *
 * @returns `{ clearDraft, wasRestored }`
 */

type StringRecord = Record<string, string>;
type Setters<T extends StringRecord> = { [K in keyof T]: (v: T[K]) => void };

interface DraftOptions {
  debounce?: number;
  /**
   * When false, the draft is neither restored nor persisted (e.g. a logged-in
   * user whose fields come authoritatively from their profile). Default true.
   */
  enabled?: boolean;
}

interface DraftReturn {
  clearDraft: () => void;
  /** True after mount when at least one field was restored from storage. */
  wasRestored: boolean;
}

export function useFormDraft<T extends StringRecord>(
  key: string,
  values: T,
  setters: Setters<T>,
  { debounce = 600, enabled = true }: DraftOptions = {},
): DraftReturn {
  const storageKey = `rh-draft:${key}`;
  const restoredRef = useRef(false);
  const [wasRestored, setWasRestored] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the first restore cycle has completed so we don't
  // overwrite the draft with empty values before loading it.
  const readyToSave = useRef(false);

  // Restore once on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    // Disabled (e.g. logged-in user): never restore and never persist.
    if (!enabled) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        readyToSave.current = true;
        return;
      }
      const saved = JSON.parse(raw) as Partial<T>;
      let didRestore = false;
      for (const k in saved) {
        if (
          Object.prototype.hasOwnProperty.call(saved, k) &&
          Object.prototype.hasOwnProperty.call(setters, k)
        ) {
          const val = saved[k];
          if (typeof val === 'string' && val !== '') {
            (setters[k] as (v: string) => void)(val);
            didRestore = true;
          }
        }
      }
      // Intentional one-time restore from localStorage — a platform API that is
      // unavailable during SSR, so a lazy state initializer isn't an option. The
      // field setters above are the same on-mount sync pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (didRestore) setWasRestored(true);
    } catch {
      // Malformed draft or unavailable storage — ignore
    } finally {
      readyToSave.current = true;
    }
    // setters are stable (setState callbacks); only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every values change (debounced), skip before first restore
  useEffect(() => {
    if (!enabled || !readyToSave.current) return;

    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values));
      } catch {
        // Quota exceeded or private-browsing restriction — silently skip
      }
    }, debounce);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [values, storageKey, debounce, enabled]);

  const clearDraft = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { clearDraft, wasRestored };
}
