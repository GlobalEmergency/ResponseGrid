'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { components } from '@reliefhub/api-client';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { LocalDate } from '@/components/atoms/local-date';
import { EmptyState } from '@/components/molecules/empty-state';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import { formatDate } from '@/lib/format-date';
import type { Messages } from '@/i18n/messages/es';
import {
  getValidityReports,
  resolveDispute,
  type DisputeResolution,
} from '@/app/e/[slug]/coordinacion/actions';

type DisputedResource = components['schemas']['DisputedResourceDto'];
type ValidityReport = components['schemas']['ValidityReportDto'];

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none';

/**
 * Coordination queue of resources flagged "disputed" by citizens. Each card
 * shows the reason breakdown and lets a coordinator confirm closure, mark the
 * point invalid or dismiss the reports — each requiring a reason (audit trail).
 */
export function DisputedQueue({
  items,
  slug,
}: {
  items: DisputedResource[];
  slug: string;
}) {
  const tc = getMessages(useLocale()).coord;

  if (items.length === 0) {
    return (
      <EmptyState
        title={tc.disputes_empty_title}
        description={tc.disputes_empty_description}
      />
    );
  }

  return (
    <ul
      className="flex flex-col gap-3"
      role="list"
      aria-label={tc.disputes_list_label}
    >
      {items.map((item) => (
        <li key={item.resource.id}>
          <DisputedCard item={item} slug={slug} tc={tc} />
        </li>
      ))}
    </ul>
  );
}

function DisputedCard({
  item,
  slug,
  tc,
}: {
  item: DisputedResource;
  slug: string;
  tc: Messages['coord'];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<DisputeResolution | null>(null);
  const [reason, setReason] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidence, setEvidence] = useState<ValidityReport[] | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const r = item.resource;
  const reasonLabels: Record<string, string> = {
    closed: tc.disputes_reason_closed,
    nonexistent: tc.disputes_reason_nonexistent,
    moved: tc.disputes_reason_moved,
    outdated: tc.disputes_reason_outdated,
  };
  const location = [r.city, r.country].filter((p) => p != null).join(', ');
  const reasonValid = reason.trim().length >= 3;

  function open(resolution: DisputeResolution): void {
    setActive(resolution);
    setError(null);
  }

  function submit(resolution: DisputeResolution): void {
    if (!reasonValid) {
      setError(tc.reason_required);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await resolveDispute(r.id, slug, resolution, reason);
      if (res.status === 'success') {
        setActive(null);
        setReason('');
        router.refresh();
      } else if (res.status === 'error') {
        setError(res.message ?? tc.error_unknown);
      }
    });
  }

  function toggleEvidence(): void {
    if (evidenceOpen) {
      setEvidenceOpen(false);
      return;
    }
    setEvidenceOpen(true);
    // Lazy-load once; keep the result cached across toggles.
    if (evidence !== null || evidenceLoading) return;
    setEvidenceLoading(true);
    setEvidenceError(null);
    void getValidityReports(r.id, slug).then((res) => {
      setEvidenceLoading(false);
      if (res.status === 'success') setEvidence(res.reports);
      else setEvidenceError(res.message);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <Link
          href={`/e/${slug}/recursos/${r.id}`}
          className="text-[15px] font-bold text-ink hover:underline"
        >
          {r.name}
        </Link>
        {location !== '' && <p className="text-xs text-muted">{location}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(item.byReason).map(([reasonKey, count]) => (
          <span
            key={reasonKey}
            className="inline-flex items-center rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning"
          >
            {(reasonLabels[reasonKey] ?? reasonKey) + ' · ' + count}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted">
        {tc.disputes_reporters_label.replace(
          '{n}',
          String(item.distinctReporters),
        )}
        {item.lastReportedAt != null &&
          ' · ' +
            tc.disputes_last_reported_label.replace(
              '{date}',
              formatDate(item.lastReportedAt, locale),
            )}
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={toggleEvidence}
          aria-expanded={evidenceOpen}
          className="w-fit text-xs font-semibold text-navy hover:underline focus:outline-none"
        >
          {evidenceOpen ? tc.disputes_evidence_hide : tc.disputes_evidence_show}
        </button>

        {evidenceOpen && (
          <div className="flex flex-col gap-2">
            {evidenceLoading && (
              <p className="text-xs text-muted">
                {tc.disputes_evidence_loading}
              </p>
            )}
            {evidenceError !== null && <ErrorMessage message={evidenceError} />}
            {evidence !== null && evidence.length === 0 && (
              <p className="text-xs text-muted">
                {tc.disputes_evidence_empty}
              </p>
            )}
            {evidence?.map((report) => (
              <div
                key={report.id}
                className="rounded-md border border-line bg-surface-alt p-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-warning">
                    {reasonLabels[report.reason] ?? report.reason}
                  </span>
                  <LocalDate iso={report.createdAt} className="text-muted" />
                </div>
                {report.note != null && report.note.trim() !== '' ? (
                  <p className="mt-1 text-ink">{report.note}</p>
                ) : (
                  <p className="mt-1 italic text-muted">
                    {tc.disputes_evidence_no_note}
                  </p>
                )}
                {report.photoUrls.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {report.photoUrls.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-info underline"
                      >
                        {tc.disputes_evidence_photo.replace(
                          '{n}',
                          String(i + 1),
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error !== null && <ErrorMessage message={error} />}

      {active === null ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="danger-outline"
            onClick={() => open('confirm_closed')}
          >
            {tc.disputes_action_confirm_closed}
          </Button>
          <Button
            type="button"
            variant="danger-outline"
            onClick={() => open('mark_invalid')}
          >
            {tc.disputes_action_mark_invalid}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => open('dismiss')}
          >
            {tc.disputes_action_dismiss}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">
              {tc.reason_label} <span className="text-danger">*</span>
            </span>
            <textarea
              className={INPUT_CLASS}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tc.reason_placeholder}
              aria-label={tc.reason_label}
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setActive(null);
                setReason('');
                setError(null);
              }}
            >
              {tc.drawer_close}
            </Button>
            <Button
              type="button"
              fullWidth
              disabled={pending || !reasonValid}
              onClick={() => submit(active)}
            >
              {pending ? tc.disputes_resolving : tc.disputes_resolve_confirm}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
