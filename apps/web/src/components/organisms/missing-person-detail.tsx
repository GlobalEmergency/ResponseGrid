'use client';

import { useActionState } from 'react';
import type {
  UpdateStatusState,
  AddSightingState,
} from '@/app/e/[slug]/coordinacion/reunificacion/actions';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { Select } from '@/components/atoms/select';
import { ErrorMessage } from '@/components/atoms/error-message';
import { FormField } from '@/components/molecules/form-field';
import { ReunificationStatusBadge } from '@/components/atoms/reunification-status-badge';
import { SightingForm } from '@/components/molecules/sighting-form';
import type { components } from '@reliefhub/api-client';
import type { Messages } from '@/i18n/messages/es';

type MissingPersonReportDetailDto =
  components['schemas']['MissingPersonReportDetailDto'];
type SightingResponseDto = components['schemas']['SightingResponseDto'];

type BoundUpdateStatusAction = (
  prev: UpdateStatusState,
  formData: FormData,
) => Promise<UpdateStatusState>;

type BoundAddSightingAction = (
  prev: AddSightingState,
  formData: FormData,
) => Promise<AddSightingState>;

interface MissingPersonDetailProps {
  report: MissingPersonReportDetailDto;
  updateStatusAction: BoundUpdateStatusAction;
  addSightingAction: BoundAddSightingAction;
  t: Messages['coord_reunificacion'];
}

const UPDATE_STATUS_INITIAL: UpdateStatusState = { status: 'idle' };

function StatusChangeForm({
  action,
  currentStatus,
  t,
}: {
  action: BoundUpdateStatusAction;
  currentStatus: string;
  t: Messages['coord_reunificacion'];
}) {
  const [state, formAction, pending] = useActionState<
    UpdateStatusState,
    FormData
  >(action, UPDATE_STATUS_INITIAL);

  if (state.status === 'success') {
    return (
      <p
        role="alert"
        aria-live="polite"
        className="rounded-md border border-green-400 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
      >
        {t.status_updated}
      </p>
    );
  }

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: 'open', label: 'Abierto' },
    { value: 'under_review', label: 'En revisión' },
    { value: 'matched', label: 'Encontrado' },
    { value: 'closed', label: 'Cerrado' },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === 'error' && <ErrorMessage message={state.message} />}

      <FormField
        htmlFor="status"
        label={
          <>
            {t.new_status_label} <span aria-hidden="true">*</span>
          </>
        }
      >
        <Select
          id="status"
          name="status"
          required
          defaultValue={currentStatus}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField htmlFor="matchNote" label={t.match_note_label}>
        <Textarea
          id="matchNote"
          name="matchNote"
          rows={2}
          placeholder={t.match_note_placeholder}
        />
      </FormField>

      <Button type="submit" disabled={pending} size="md">
        {pending ? t.saving_status : t.save_status}
      </Button>
    </form>
  );
}

/**
 * MissingPersonDetail — Full coordinator view of a missing person report.
 * Shows all fields (including sensitive ones), sightings history,
 * status change form, and add sighting form.
 */
export function MissingPersonDetail({
  report,
  updateStatusAction,
  addSightingAction,
  t,
}: MissingPersonDetailProps) {
  // documentId is typed as Record<string, never> in generated schema for optional fields.
  // At runtime it is a string or undefined. We cast safely via unknown.
  const rawDocId =
    report.person.documentId != null
      ? (report.person.documentId as unknown as string)
      : undefined;
  // Full doc — shown in coordinator detail only
  const fullDoc = typeof rawDocId === 'string' && rawDocId !== '' ? rawDocId : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Status */}
      <div className="flex items-center gap-3">
        <ReunificationStatusBadge status={report.status} />
        <time
          suppressHydrationWarning
          dateTime={report.createdAt}
          className="text-xs text-gray-400"
        >
          {new Date(report.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </div>

      {/* Person data */}
      <section aria-labelledby="detail-person-heading" className="flex flex-col gap-3">
        <h2
          id="detail-person-heading"
          className="text-base font-bold text-gray-900 uppercase tracking-wide"
        >
          {t.person_section}
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-700 min-w-32">Nombre:</dt>
            <dd className="text-gray-900">
              {report.person.firstName} {report.person.lastName}
            </dd>
          </div>
          {fullDoc != null && (
            <div className="flex gap-2">
              <dt className="font-semibold text-gray-700 min-w-32">Documento:</dt>
              <dd className="text-gray-900 font-mono">{fullDoc}</dd>
            </div>
          )}
          {report.person.approximateAge != null && (
            <div className="flex gap-2">
              <dt className="font-semibold text-gray-700 min-w-32">Edad aprox.:</dt>
              <dd className="text-gray-900">
                {String(report.person.approximateAge as unknown as number)}
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-700 min-w-32">Última ubicación:</dt>
            <dd className="text-gray-900">{report.person.lastKnownLocation}</dd>
          </div>
          {report.person.description != null && (
              <div className="flex gap-2">
                <dt className="font-semibold text-gray-700 min-w-32">Descripción:</dt>
                <dd className="text-gray-900">
                  {report.person.description as unknown as string}
                </dd>
              </div>
            )}
        </dl>
      </section>

      {/* Reporter (contact) data — full, coordinator only */}
      <section aria-labelledby="detail-reporter-heading" className="flex flex-col gap-3">
        <h2
          id="detail-reporter-heading"
          className="text-base font-bold text-gray-900 uppercase tracking-wide"
        >
          {t.reporter_section}
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-700 min-w-32">Nombre:</dt>
            <dd className="text-gray-900">{report.reporterName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-700 min-w-32">Teléfono:</dt>
            <dd className="text-gray-900">
              <a
                href={`tel:${report.reporterPhone}`}
                className="underline underline-offset-2 hover:text-gray-700"
              >
                {report.reporterPhone}
              </a>
            </dd>
          </div>
          {report.reporterEmail != null && (
              <div className="flex gap-2">
                <dt className="font-semibold text-gray-700 min-w-32">Email:</dt>
                <dd className="text-gray-900">
                  <a
                    href={`mailto:${report.reporterEmail as unknown as string}`}
                    className="underline underline-offset-2 hover:text-gray-700"
                  >
                    {report.reporterEmail as unknown as string}
                  </a>
                </dd>
              </div>
            )}
        </dl>
      </section>

      {/* Sightings */}
      <section aria-labelledby="detail-sightings-heading" className="flex flex-col gap-3">
        <h2
          id="detail-sightings-heading"
          className="text-base font-bold text-gray-900 uppercase tracking-wide"
        >
          {t.sightings_section}
        </h2>
        {report.sightings.length === 0 ? (
          <p className="text-sm text-gray-500">{t.no_sightings}</p>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {report.sightings.map((sighting: SightingResponseDto) => (
              <li
                key={sighting.id}
                className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {sighting.location}
                  </span>
                  <time
                    suppressHydrationWarning
                    dateTime={sighting.reportedAt}
                    className="text-xs text-gray-400 flex-shrink-0"
                  >
                    {new Date(sighting.reportedAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                </div>
                <p className="text-gray-700">{sighting.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Change status */}
      <section aria-labelledby="detail-status-heading" className="flex flex-col gap-4 border-t border-gray-200 pt-6">
        <h2
          id="detail-status-heading"
          className="text-base font-bold text-gray-900 uppercase tracking-wide"
        >
          {t.change_status_heading}
        </h2>
        <StatusChangeForm
          action={updateStatusAction}
          currentStatus={report.status}
          t={t}
        />
      </section>

      {/* Add sighting */}
      <section aria-labelledby="detail-sighting-form-heading" className="flex flex-col gap-4 border-t border-gray-200 pt-6">
        <h2
          id="detail-sighting-form-heading"
          className="text-base font-bold text-gray-900 uppercase tracking-wide"
        >
          {t.add_sighting_heading}
        </h2>
        <SightingForm action={addSightingAction} t={t} />
      </section>
    </div>
  );
}
