'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { reviewReport } from '@/app/e/[slug]/reportar/actions';
import type { ReviewReportResult } from '@/app/e/[slug]/reportar/actions';
import {
  editReport,
  discardReport,
} from '@/app/e/[slug]/coordinacion/actions';
import { Button } from '@/components/atoms/button';
import {
  ValidationActions,
  type EditField,
} from '@/components/organisms/validation-actions';
import { LocalDate } from '@/components/atoms/local-date';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** Report timestamp format: "05 jun, 14:32" — preserved from the original. */
const REPORT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';
type ReportStatus = 'open' | 'reviewed' | 'closed';
type ReportType = 'incident' | 'stock' | 'status' | 'other';

const PRIORITY_CLASSES: Record<ReportPriority, string> = {
  low: 'inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted',
  medium: 'inline-flex items-center rounded-full border border-info-line bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info',
  high: 'inline-flex items-center rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning',
  urgent: 'inline-flex items-center rounded-full border border-danger bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger',
};

const STATUS_CLASSES: Record<ReportStatus, string> = {
  open: 'inline-flex items-center rounded-full border border-info-line bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info',
  reviewed: 'inline-flex items-center rounded-full border border-success bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success',
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
  const router = useRouter();

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

  const editFields: EditField[] = [
    {
      key: 'note',
      label: tc.edit_field_note,
      kind: 'textarea',
      defaultValue: report.note,
    },
    {
      key: 'priority',
      label: tc.detail_field_priority,
      kind: 'select',
      defaultValue: report.priority,
      options: (
        ['low', 'medium', 'high', 'urgent'] as ReportPriority[]
      ).map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    },
  ];

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
          <LocalDate iso={report.createdAt} opts={REPORT_DATE_OPTS} />
        )}
      </div>

      {/* Review action */}
      {!isReviewed && (
        <form action={reviewFormAction}>
          {reviewState.status === 'error' && (
            <p className="text-xs text-danger mb-2">{reviewState.message}</p>
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
        <p className="text-xs text-success font-medium">{tc.report_reviewed}</p>
      )}

      <ValidationActions
        canAct={report.status !== 'closed'}
        editFields={editFields}
        onEdit={(reason, values) =>
          editReport(report.id, slug, {
            reason,
            note: values.note,
            priority: values.priority as ReportPriority,
          })
        }
        onDiscard={(reason) => discardReport(report.id, slug, reason)}
        onActionSuccess={() => router.refresh()}
      />
    </article>
  );
}
