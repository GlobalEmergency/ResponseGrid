'use client';

import { useActionState } from 'react';
import {
  pauseEmergency,
  resumeEmergency,
  publishAnnouncement,
} from '@/app/e/[slug]/coordinacion/actions';
import type { ActionResult } from '@/app/e/[slug]/coordinacion/actions';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface EmergencyControlsProps {
  emergencyId: string;
  slug: string;
  status: 'active' | 'paused' | 'closed';
  /** Current announcement text, used to pre-fill the textarea */
  currentAnnouncement: string | null;
}

const IDLE: ActionResult = { status: 'idle' };

export function EmergencyControls({
  emergencyId,
  slug,
  status,
  currentAnnouncement,
}: EmergencyControlsProps) {
  const tc = getMessages(useLocale()).coord;

  // --- Pause / Resume state ------------------------------------------------
  const [lifecycleState, lifecycleAction, lifecyclePending] = useActionState<
    ActionResult,
    FormData
  >(
    async (_prev, formData) => {
      const intent = formData.get('intent');
      if (intent === 'pause') {
        return pauseEmergency(emergencyId, slug);
      }
      if (intent === 'resume') {
        return resumeEmergency(emergencyId, slug);
      }
      return { status: 'error', message: tc.controls_unknown_action };
    },
    IDLE,
  );

  // --- Announcement state --------------------------------------------------
  const [announcementState, announcementAction, announcementPending] =
    useActionState<ActionResult, FormData>(
      async (_prev, formData) => {
        const message = formData.get('message');
        if (typeof message !== 'string' || message.trim() === '') {
          return { status: 'error', message: tc.controls_announcement_empty };
        }
        return publishAnnouncement(emergencyId, slug, message.trim());
      },
      IDLE,
    );

  const isClosed = status === 'closed';

  return (
    <section aria-labelledby="controls-heading" className="flex flex-col gap-6">
      <h2
        id="controls-heading"
        className="text-xl font-bold text-ink"
      >
        {tc.controls_heading}
      </h2>

      {/* ── Kill-switch ─────────────────────────────────────────────────── */}
      {!isClosed && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {tc.controls_intake_heading}
          </h3>

          {lifecycleState.status === 'error' && (
            <ErrorMessage message={lifecycleState.message} />
          )}
          {lifecycleState.status === 'success' && (
            <p
              role="status"
              className="rounded-md border border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
            >
              {status === 'paused' ? tc.controls_intake_paused : tc.controls_intake_resumed}
            </p>
          )}

          <form action={lifecycleAction}>
            <input
              type="hidden"
              name="intent"
              value={status === 'active' ? 'pause' : 'resume'}
            />
            <Button
              type="submit"
              variant={status === 'active' ? 'danger-outline' : 'secondary'}
              disabled={lifecyclePending}
              fullWidth
            >
              {lifecyclePending
                ? tc.processing
                : status === 'active'
                  ? tc.controls_pause
                  : tc.controls_resume}
            </Button>
          </form>
        </div>
      )}

      {/* ── Official announcement ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {tc.controls_announcement_heading}
        </h3>

        {announcementState.status === 'error' && (
          <ErrorMessage message={announcementState.message} />
        )}
        {announcementState.status === 'success' && (
          <p
            role="status"
            className="rounded-md border border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          >
            {tc.controls_announcement_published}
          </p>
        )}

        <form action={announcementAction} className="flex flex-col gap-3">
          <label
            htmlFor="announcement-message"
            className="sr-only"
          >
            {tc.controls_announcement_label}
          </label>
          <Textarea
            id="announcement-message"
            name="message"
            rows={4}
            placeholder={tc.controls_announcement_placeholder}
            defaultValue={currentAnnouncement ?? ''}
            aria-describedby={
              announcementState.status === 'error'
                ? 'announcement-error'
                : undefined
            }
          />
          <Button
            type="submit"
            variant="primary"
            disabled={announcementPending}
            fullWidth
          >
            {announcementPending ? tc.controls_announcement_publishing : tc.controls_announcement_publish}
          </Button>
        </form>
      </div>
    </section>
  );
}
