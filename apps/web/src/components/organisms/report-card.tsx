'use client';

import { useActionState, useState } from 'react';
import { reviewReport, publishReport } from '@/app/e/[slug]/reportar/actions';
import type { ReviewReportResult, PublishReportResult } from '@/app/e/[slug]/reportar/actions';
import { Button } from '@/components/atoms/button';
import { DamageLevelBadge } from '@/components/atoms/damage-level-badge';
import { TrappedPersonsCount } from '@/components/atoms/trapped-persons-count';
import type { DamageLevel } from '@/components/atoms/damage-level-badge';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';
type ReportStatus = 'open' | 'reviewed' | 'published' | 'closed';
type ReportType =
  | 'incident'
  | 'stock'
  | 'status'
  | 'other'
  | 'structural_damage'
  | 'trapped_persons';

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_CLASSES: Record<ReportPriority, string> = {
  low: 'inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-600',
  medium: 'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800',
  high: 'inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800',
  urgent: 'inline-flex items-center rounded-full border border-red-600 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700',
};

const STATUS_CLASSES: Record<ReportStatus, string> = {
  open: 'inline-flex items-center rounded-full border border-blue-400 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800',
  reviewed: 'inline-flex items-center rounded-full border border-green-400 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800',
  published: 'inline-flex items-center rounded-full border border-purple-400 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800',
  closed: 'inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Abierto',
  reviewed: 'Revisado',
  published: 'Publicado',
  closed: 'Cerrado',
};

const TYPE_LABELS: Record<ReportType, string> = {
  incident: 'Incidencia',
  stock: 'Stock',
  status: 'Estado',
  other: 'Otro',
  structural_damage: 'Daños estructurales',
  trapped_persons: 'Personas atrapadas',
};

export interface FieldReport {
  id: string;
  type: ReportType;
  note: string;
  priority: ReportPriority;
  status: ReportStatus;
  photoUrls?: string[] | null;
  resourceId?: string | null;
  resourceName?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
  // SAR-specific fields
  damageLevel?: DamageLevel | null;
  trappedPersonsEstimate?: number | null;
  accessibleForRescue?: boolean | null;
  buildingType?: string | null;
  publishedAt?: string | null;
  publishNote?: string | null;
}

interface ReportCardProps {
  report: FieldReport;
  slug: string;
}

const INITIAL_REVIEW_STATE: ReviewReportResult = { status: 'idle' };
const INITIAL_PUBLISH_STATE: PublishReportResult = { status: 'idle' };

const isStructuralType = (t: ReportType) =>
  t === 'structural_damage' || t === 'trapped_persons';

/** Inline publish modal shown inside the card */
function PublishModal({
  onConfirm,
  onCancel,
  pending,
  error,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  pending: boolean;
  error?: string;
}) {
  const [note, setNote] = useState('');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Publicar parte de daños"
      className="rounded-lg border-2 border-purple-600 bg-purple-50 p-4 flex flex-col gap-3"
    >
      <p className="text-sm font-semibold text-purple-900">
        Publicar este parte lo hará visible en el mapa público. ¿Estás seguro?
      </p>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="publish-note"
          className="text-xs font-semibold text-purple-900 uppercase tracking-wide"
        >
          Nota pública (opcional)
        </label>
        <textarea
          id="publish-note"
          rows={2}
          className="w-full rounded-lg border-2 border-purple-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
          placeholder="Breve nota de coordinación visible al público…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error !== undefined && error !== '' && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => onConfirm(note)}
        >
          {pending ? 'Publicando…' : 'Confirmar publicación'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function ReportCard({ report, slug }: ReportCardProps) {
  const [reviewState, reviewFormAction, reviewPending] = useActionState<ReviewReportResult, FormData>(
    async (_prev, _formData) => reviewReport(report.id, slug),
    INITIAL_REVIEW_STATE,
  );

  const [publishState, , publishPending] = useActionState<PublishReportResult, FormData>(
    async (_prev, _formData) => {
      // note is passed via closure from the modal
      return { status: 'idle' as const };
    },
    INITIAL_PUBLISH_STATE,
  );

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [isPublished, setIsPublished] = useState(report.status === 'published');
  const [publishingNote, setPublishingNote] = useState<string | undefined>(undefined);
  const [isPublishPending, setIsPublishPending] = useState(false);

  const isReviewed =
    report.status === 'reviewed' ||
    reviewState.status === 'success';

  const effectiveStatus: ReportStatus = isPublished
    ? 'published'
    : isReviewed
      ? 'reviewed'
      : (report.status === 'closed' ? 'closed' : 'open');

  const priorityClass = PRIORITY_CLASSES[report.priority] ?? PRIORITY_CLASSES.low;
  const statusClass = STATUS_CLASSES[effectiveStatus];
  const statusLabel = STATUS_LABELS[effectiveStatus];

  const structural = isStructuralType(report.type);

  async function handlePublishConfirm(note: string) {
    setIsPublishPending(true);
    setPublishError('');
    try {
      const result = await publishReport(report.id, slug, note);
      if (result.status === 'success') {
        setIsPublished(true);
        setPublishingNote(note || undefined);
        setShowPublishModal(false);
      } else if (result.status === 'error') {
        setPublishError(result.message);
      }
    } finally {
      setIsPublishPending(false);
    }
  }

  // Suppress unused var warning — publishState is used to satisfy useActionState
  void publishState;
  void publishPending;
  void publishingNote;

  return (
    <article
      aria-label={`Parte: ${TYPE_LABELS[report.type] ?? report.type}`}
      className={[
        'flex flex-col gap-4 rounded-lg border-2 bg-white p-5',
        structural ? 'border-red-400' : 'border-gray-900',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">
          {TYPE_LABELS[report.type] ?? report.type}
        </span>
        <span aria-hidden="true" className="text-gray-300">·</span>
        <span className={priorityClass}>
          {PRIORITY_LABELS[report.priority] ?? report.priority}
        </span>
        <span className={statusClass}>{statusLabel}</span>

        {/* SAR badges */}
        {structural && report.damageLevel != null && (
          <DamageLevelBadge level={report.damageLevel} />
        )}
        {report.type === 'trapped_persons' && (
          <TrappedPersonsCount count={report.trappedPersonsEstimate} />
        )}
      </div>

      {/* SAR extra info */}
      {structural && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {report.buildingType != null && (
            <span>Edificio: <strong>{report.buildingType}</strong></span>
          )}
          {report.accessibleForRescue != null && (
            <span>
              Acceso para rescate:{' '}
              <strong>{report.accessibleForRescue ? 'Sí' : 'No'}</strong>
            </span>
          )}
          {isPublished && report.publishNote != null && (
            <span className="text-purple-700">Nota pública: {report.publishNote}</span>
          )}
        </div>
      )}

      {/* Note */}
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {report.note}
      </p>

      {/* Photo thumbnails */}
      {report.photoUrls != null && report.photoUrls.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Fotos del parte">
          {report.photoUrls.filter((u) => u !== '').map((urlOrKey) => {
            const src = urlOrKey.startsWith('http')
              ? urlOrKey
              : urlOrKey.startsWith('/')
                ? `${API_BASE}${urlOrKey}`
                : `${API_BASE}/files/${urlOrKey}`;
            return (
              <li key={urlOrKey}>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded overflow-hidden border border-gray-200 hover:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
                  aria-label="Ver foto a tamaño completo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt="Foto del parte"
                    className="w-16 h-16 object-cover"
                    loading="lazy"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {report.resourceName != null && (
          <span>Punto: {report.resourceName}</span>
        )}
        {report.authorName != null && (
          <span>Autor: {report.authorName}</span>
        )}
        {report.createdAt != null && (
          <time dateTime={report.createdAt} suppressHydrationWarning>
            {new Date(report.createdAt).toLocaleString('es-ES', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        )}
      </div>

      {/* Review action */}
      {!isReviewed && !isPublished && (
        <form action={reviewFormAction}>
          {reviewState.status === 'error' && (
            <p className="text-xs text-red-600 mb-2">{reviewState.message}</p>
          )}
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={reviewPending}
          >
            {reviewPending ? 'Marcando…' : 'Marcar revisado'}
          </Button>
        </form>
      )}

      {(reviewState.status === 'success' || (isReviewed && !isPublished)) && !structural && (
        <p className="text-xs text-green-700 font-medium">Parte revisado.</p>
      )}

      {/* Publish action — only for structural types in reviewed state */}
      {structural && isReviewed && !isPublished && !showPublishModal && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setShowPublishModal(true)}
          >
            Publicar en mapa
          </Button>
          <p className="self-center text-xs text-green-700 font-medium">Revisado.</p>
        </div>
      )}

      {structural && showPublishModal && (
        <PublishModal
          onConfirm={handlePublishConfirm}
          onCancel={() => { setShowPublishModal(false); setPublishError(''); }}
          pending={isPublishPending}
          error={publishError}
        />
      )}

      {structural && isPublished && (
        <p className="text-xs text-purple-700 font-medium">Publicado en mapa.</p>
      )}
    </article>
  );
}
