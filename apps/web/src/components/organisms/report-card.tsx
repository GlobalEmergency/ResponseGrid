'use client';

import { useActionState } from 'react';
import { reviewReport } from '@/app/e/[slug]/reportar/actions';
import type { ReviewReportResult } from '@/app/e/[slug]/reportar/actions';
import { Button } from '@/components/atoms/button';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';
type ReportStatus = 'open' | 'reviewed' | 'closed';
type ReportType = 'incident' | 'stock' | 'status' | 'other';

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
  closed: 'inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Abierto',
  reviewed: 'Revisado',
  closed: 'Cerrado',
};

const TYPE_LABELS: Record<ReportType, string> = {
  incident: 'Incidencia',
  stock: 'Stock',
  status: 'Estado',
  other: 'Otro',
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
}

interface ReportCardProps {
  report: FieldReport;
  slug: string;
}

const INITIAL_REVIEW_STATE: ReviewReportResult = { status: 'idle' };

export function ReportCard({ report, slug }: ReportCardProps) {
  const [reviewState, reviewFormAction, reviewPending] = useActionState<ReviewReportResult, FormData>(
    async (_prev, _formData) => reviewReport(report.id, slug),
    INITIAL_REVIEW_STATE,
  );

  const isReviewed =
    report.status === 'reviewed' || reviewState.status === 'success';

  const effectiveStatus: ReportStatus = isReviewed
    ? 'reviewed'
    : report.status === 'closed'
      ? 'closed'
      : 'open';

  const priorityClass = PRIORITY_CLASSES[report.priority] ?? PRIORITY_CLASSES.low;
  const statusClass = STATUS_CLASSES[effectiveStatus];
  const statusLabel = STATUS_LABELS[effectiveStatus];

  return (
    <article
      aria-label={`Parte: ${TYPE_LABELS[report.type] ?? report.type}`}
      className="flex flex-col gap-4 rounded-lg border-2 border-gray-900 bg-white p-5"
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
      </div>

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
      {!isReviewed && (
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

      {(reviewState.status === 'success' || isReviewed) && (
        <p className="text-xs text-green-700 font-medium">Parte revisado.</p>
      )}
    </article>
  );
}
