'use client';

/**
 * Modal — generic centered dialog rendered through a portal.
 *
 * Why a portal: this modal is opened from inside other `<form>` elements (the
 * petición/registrar/donar forms). Rendering its content into `document.body`
 * keeps the modal's own `<form>` out of the parent form's DOM subtree, avoiding
 * invalid nested forms.
 *
 * A11y mirrors `DetailDrawer`: closes on Escape and backdrop tap, locks body
 * scroll while open, `role="dialog" aria-modal`. On mobile it is a bottom sheet;
 * from `sm:` up it becomes a centered card.
 */
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Accessible label for the close affordances. */
  closeLabel: string;
  /** Accessible label for the dialog (defaults to the title). */
  ariaLabel?: string;
}

export function Modal({ open, onClose, title, children, closeLabel, ariaLabel }: ModalProps) {
  // Escape to close + lock body scroll while open (external systems → effect).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // `open` only flips to true from a client-side interaction, so the portal
  // (and its `document.body` reference) is never reached during SSR/hydration.
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:m-4 sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-tight text-ink break-words">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
