'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

const selectClass =
  'rounded-lg border-2 border-line bg-white px-3 py-1.5 text-sm text-ink focus:border-navy focus:outline-none';

/**
 * AuditFilter — client component that drives `entityType` and
 * `emergencyId` searchParams filters for the audit log page.
 * Uses router.replace so the Server Component page re-renders with
 * updated params without a full navigation.
 */
export function AuditFilter() {
  const ta = getMessages(useLocale()).admin;
  const router = useRouter();
  const searchParams = useSearchParams();

  const entityTypeOptions = [
    { value: '', label: ta.audit_type_all },
    { value: 'resource', label: ta.audit_type_resource },
    { value: 'need', label: ta.audit_type_need },
    { value: 'emergency', label: ta.audit_type_emergency },
    { value: 'offer', label: ta.audit_type_offer },
    { value: 'report', label: ta.audit_type_report },
    { value: 'volunteer', label: ta.audit_type_volunteer },
    { value: 'organization', label: ta.audit_type_organization },
    { value: 'accreditation', label: ta.audit_type_accreditation },
    { value: 'template', label: ta.audit_type_template },
  ] as const;

  const currentEntityType = searchParams.get('entityType') ?? '';
  const currentEmergencyId = searchParams.get('emergencyId') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // reset offset when filter changes
    params.delete('offset');
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label={ta.audit_filters_group_aria}>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>{ta.audit_entity_type_label}</span>
        <select
          value={currentEntityType}
          onChange={(e) => updateParam('entityType', e.target.value)}
          className={selectClass}
          aria-label={ta.audit_entity_type_aria}
        >
          {entityTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>{ta.audit_emergency_id_label}</span>
        <input
          type="text"
          value={currentEmergencyId}
          onChange={(e) => updateParam('emergencyId', e.target.value)}
          className={`${selectClass} min-w-[14rem]`}
          placeholder={ta.audit_emergency_id_ph}
          aria-label={ta.audit_emergency_id_aria}
        />
      </label>
    </div>
  );
}
