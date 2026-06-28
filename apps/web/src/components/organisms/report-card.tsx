'use client';

import { useActionState } from 'react';
import { reviewReport } from '@/app/e/[slug]/reportar/actions';
import type { ReviewReportResult } from '@/app/e/[slug]/reportar/actions';
import { Button } from '@/components/atoms/button';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';
type ReportStatus = 'open' | 'reviewed' | 'closed';
type ReportType = 'incident' | 'stock' | 'status' | 'other';

const PRIORITY_CLASSES: Record<ReportPriority, string> = {
  low: 'inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted',
  medium: 'inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800',
  high: 'inline-flex items-center rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800',
  urgent: 'inline-flex items-center rounded-full border border-red-600 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700',
};

const STATUS_CLASSES: Record<ReportStatus, string> = {
  open: 'inline-flex items-center rounded-full border border-blue-400 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800',
  reviewed: 'inline-flex items-center rounded-full border border-green-400 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800',
  closed: 'inline-flex items-center rounded-full border border-line bg-surface-alt px-2.5 py-0.5 text-xs font-semibold text-muted',
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
  const locale = useLocale();
  const tc = getMessages(locale).coord;

  const PRIORITY_LABELS: Record<ReportPriority, string> = {
    low: tc.priority_low,
    medium: tc.priority_medium,
    high: tc.priority_high,
    urgent: tc.priority_urgent,
  };

  const STATUS_LABELS: Record<ReportStatus, string> = {
    open: tc.report_status_open,
    reviewed: tc.report_status_reviewed,
    closed: tc.report_status_closed,
  };

  const TYPE_LABELS: Record<ReportType, string> = {
    incident: tc.report_type_incident,
    stock: tc.report_type_stock,
    status: tc.report_type_status,
    other: tc.report_type_other,
  };

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
      aria-label={tc.report_card_label.replace('{type}', TYPE_LABELS[report.type] ?? report.type)}
      className="flex flex-col gap-4 rounded-lg border-2 border-navy bg-white p-5"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink">
          {TYPE_LABELS[report.type] ?? report.type}
        </span>
        <span aria-hidden="true" className="text-muted-soft">·</span>
        <span className={priorityClass}>
          {PRIORITY_LABELS[report.priority] ?? report.priority}
        </span>
        <span className={statusClass}>{statusLabel}</span>
      </div>

      {/* Note */}
      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
        {report.note}
      </p>

      {/* Photo thumbnails */}
      {report.photoUrls != null && report.photoUrls.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={tc.report_photos_label}>
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
                  className="block rounded overflow-hidden border border-line hover:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1"
                  aria-label={tc.report_photo_view_label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={tc.report_photo_alt}
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {report.resourceName != null && (
          <span>{tc.report_point_label}: {report.resourceName}</span>
        )}
        {report.authorName != null && (
          <span>{tc.report_author_label}: {report.authorName}</span>
        )}
        {report.createdAt != null && (
          <time dateTime={report.createdAt} suppressHydrationWarning>
            {new Date(report.createdAt).toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES', {
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
            {reviewPending ? tc.report_marking : tc.report_mark_reviewed}
          </Button>
        </form>
      )}

      {(reviewState.status === 'success' || isReviewed) && (
        <p className="text-xs text-green-700 font-medium">{tc.report_reviewed}</p>
      )}
    </article>
  );
}
