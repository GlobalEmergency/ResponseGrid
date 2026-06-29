'use client';

import { useState } from 'react';
import { getMessages } from '@/i18n';
import { useLocale } from '@/i18n/locale-context';
import { CreateOrgModal } from '@/components/molecules/create-org-modal';
import type { CreatedOrg } from './org-selector-actions';

interface Org {
  id: string;
  name: string;
  type: string;
  verificationLevel: string;
}

interface OrgSelectorFieldProps {
  initialOrgs: Org[];
}

export function OrgSelectorField({ initialOrgs }: OrgSelectorFieldProps) {
  const m = getMessages(useLocale());
  const [orgs, setOrgs] = useState<Org[]>(initialOrgs);
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreated(org: CreatedOrg) {
    setOrgs((prev) => (prev.some((o) => o.id === org.id) ? prev : [...prev, org]));
    setSelectedId(org.id);
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="organizationId" className="text-sm font-semibold text-ink">
        {m.ui.on_behalf_of}
      </label>
      <select
        id="organizationId"
        name="organizationId"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full rounded-lg border-2 border-navy bg-white px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
      >
        <option value="">{m.ui.as_individual}</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="self-start rounded text-sm font-semibold text-navy underline underline-offset-2 hover:text-navy-700 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
      >
        + {m.ui.org_create_button}
      </button>

      <CreateOrgModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
