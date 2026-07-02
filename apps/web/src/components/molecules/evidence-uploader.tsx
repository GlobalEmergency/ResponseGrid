'use client';

import { useCallback, useRef, useState } from 'react';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { compressImage } from '@/lib/compress-image';

interface EvidenceUploaderProps {
  /** Reports the backend storage key (from POST /files), or null when cleared. */
  onKeyChange: (key: string | null) => void;
  label: string;
}

interface State {
  previewUrl: string;
  uploading: boolean;
  ok: boolean;
  error: string | null;
}

/**
 * Single optional evidence photo for the reception desk (#129). Compresses in
 * the browser, uploads via the /api/upload proxy (which preserves the httpOnly
 * auth cookie) and reports the returned storage `key` — reused as the intake's
 * `evidenceFileKey`. One photo is enough here; use PhotoUploader for many.
 */
export function EvidenceUploader({ onKeyChange, label }: EvidenceUploaderProps) {
  const t = getMessages(useLocale()).ui;
  const [state, setState] = useState<State | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (file == null || !file.type.startsWith('image/')) return;

      const previewUrl = URL.createObjectURL(file);
      setState({ previewUrl, uploading: true, ok: false, error: null });
      onKeyChange(null);

      let blob: Blob = file;
      try {
        blob = await compressImage(file);
      } catch {
        // compression failed — upload the original
      }

      try {
        const formData = new FormData();
        formData.append('file', blob, file.name);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          setState({
            previewUrl,
            uploading: false,
            ok: false,
            error: t.photo_upload_error,
          });
          return;
        }
        const data: unknown = await res.json();
        const key =
          typeof data === 'object' &&
          data != null &&
          typeof (data as Record<string, unknown>).key === 'string'
            ? ((data as Record<string, unknown>).key as string)
            : null;
        if (key == null) {
          setState({
            previewUrl,
            uploading: false,
            ok: false,
            error: t.photo_no_url,
          });
          return;
        }
        setState({ previewUrl, uploading: false, ok: true, error: null });
        onKeyChange(key);
      } catch {
        setState({
          previewUrl,
          uploading: false,
          ok: false,
          error: t.photo_network_error,
        });
      } finally {
        if (inputRef.current != null) inputRef.current.value = '';
      }
    },
    [onKeyChange, t],
  );

  const remove = useCallback(() => {
    setState((prev) => {
      if (prev != null) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    onKeyChange(null);
  }, [onKeyChange]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink">
        {label}
      </p>

      {state == null ? (
        <label
          htmlFor="evidence-input"
          className="flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface px-4 py-6 text-sm text-muted transition-colors hover:border-navy hover:bg-surface-alt focus-within:ring-2 focus-within:ring-navy focus-within:ring-offset-2"
        >
          <span>{t.select_images}</span>
          <input
            ref={inputRef}
            id="evidence-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void handleFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-line bg-surface-alt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {state.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="text-xs font-medium text-muted">
                  {t.uploading}
                </span>
              </div>
            )}
            {state.ok && (
              <div className="absolute bottom-0 left-0 right-0 bg-success/90 px-1 py-0.5">
                <span className="text-xs font-medium text-white">OK</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {state.error != null && (
              <span className="text-xs text-danger">{state.error}</span>
            )}
            <button
              type="button"
              onClick={remove}
              className="w-fit rounded text-xs text-danger underline hover:text-danger focus:outline-none focus:ring-1 focus:ring-danger"
            >
              {t.remove}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
