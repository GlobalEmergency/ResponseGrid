'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

export function VolunteerRosterFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tc = getMessages(useLocale()).coord;

  const SKILL_OPTIONS = [
    { value: '', label: tc.roster_filter_skill_all },
    { value: 'driving', label: tc.skill_driving },
    { value: 'medical', label: tc.skill_medical },
    { value: 'logistics', label: tc.skill_logistics },
    { value: 'cooking', label: tc.skill_cooking },
    { value: 'languages', label: tc.skill_languages },
    { value: 'admin', label: tc.skill_admin },
    { value: 'general', label: tc.skill_general },
  ] as const;

  const AVAILABILITY_OPTIONS = [
    { value: '', label: tc.roster_filter_availability_all },
    { value: 'immediate', label: tc.availability_immediate },
    { value: 'this_week', label: tc.availability_this_week },
    { value: 'flexible', label: tc.availability_flexible },
  ] as const;

  const VEHICLE_OPTIONS = [
    { value: '', label: tc.roster_filter_vehicle_all },
    { value: 'none', label: tc.vehicle_none },
    { value: 'car', label: tc.vehicle_car },
    { value: 'van', label: tc.vehicle_van },
    { value: 'truck', label: tc.vehicle_truck },
  ] as const;

  const STATUS_OPTIONS = [
    { value: '', label: tc.roster_filter_status_all },
    { value: 'available', label: tc.volunteer_status_available },
    { value: 'assigned', label: tc.volunteer_status_assigned },
    { value: 'inactive', label: tc.volunteer_status_inactive },
  ] as const;

  const currentSkill = searchParams.get('skill') ?? '';
  const currentAvailability = searchParams.get('availability') ?? '';
  const currentVehicle = searchParams.get('vehicle') ?? '';
  const currentStatus = searchParams.get('vstatus') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const selectClass =
    'rounded-lg border-2 border-line bg-white px-3 py-1.5 text-sm text-ink focus:border-navy focus:outline-none';

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label={tc.roster_filter_group_label}>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>{tc.roster_filter_skill_field}</span>
        <select
          value={currentSkill}
          onChange={(e) => updateParam('skill', e.target.value)}
          className={selectClass}
          aria-label={tc.roster_filter_skill_aria}
        >
          {SKILL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>{tc.roster_filter_availability_field}</span>
        <select
          value={currentAvailability}
          onChange={(e) => updateParam('availability', e.target.value)}
          className={selectClass}
          aria-label={tc.roster_filter_availability_aria}
        >
          {AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>{tc.roster_filter_vehicle_field}</span>
        <select
          value={currentVehicle}
          onChange={(e) => updateParam('vehicle', e.target.value)}
          className={selectClass}
          aria-label={tc.roster_filter_vehicle_aria}
        >
          {VEHICLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>{tc.roster_filter_status_field}</span>
        <select
          value={currentStatus}
          onChange={(e) => updateParam('vstatus', e.target.value)}
          className={selectClass}
          aria-label={tc.roster_filter_status_aria}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
