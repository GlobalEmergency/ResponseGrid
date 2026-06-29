'use client';

/**
 * CreateOrgModal — inline organization creation in a modal.
 *
 * Lets a user create an organization without leaving the form they are filling
 * in (petición/registrar/donar). On success it calls `onCreated` with the new
 * org so the caller can select it immediately.
 *
 * Inputs are controlled (no nested `<form>` submission to the parent form); the
 * server action is invoked directly. The surrounding `Modal` portals this out
 * of the parent form's DOM, so the `<form>` here is safe.
 */
import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/molecules/modal';
import { Input } from '@/components/atoms/input';
import { Select } from '@/components/atoms/select';
import { Button } from '@/components/atoms/button';
import { ErrorMessage } from '@/components/atoms/error-message';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';
import {
  createOrganizationInline,
  type CreatedOrg,
} from '@/components/molecules/org-selector-actions';

interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (org: CreatedOrg) => void;
}

export function CreateOrgModal({ open, onClose, onCreated }: CreateOrgModalProps) {
  const m = getMessages(useLocale());
  const to = m.organizaciones;

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const orgTypes = [
    { value: 'ngo', label: to.f_type_ngo },
    { value: 'company', label: to.f_type_company },
    { value: 'public_admin', label: to.f_type_public },
    { value: 'association', label: to.f_type_association },
    { value: 'transport_operator', label: to.f_type_transport },
    { value: 'other', label: to.f_type_other },
  ];

  function reset() {
    setName('');
    setType('');
    setTaxId('');
    setContactEmail('');
    setError(null);
    setPending(false);
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !type) {
      setError(to.err_name_type_required);
      return;
    }

    setPending(true);
    const result = await createOrganizationInline({
      name,
      type,
      taxId: taxId.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
    });

    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    onCreated(result.org);
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={m.ui.org_modal_title}
      closeLabel={m.ui.modal_close}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {error !== null && <ErrorMessage message={error} />}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="modal-org-name" className="text-sm font-semibold text-ink">
            {to.f_name} <span aria-hidden="true">*</span>
          </label>
          <Input
            id="modal-org-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={to.f_name_ph}
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="modal-org-type" className="text-sm font-semibold text-ink">
            {to.f_type} <span aria-hidden="true">*</span>
          </label>
          <Select
            id="modal-org-type"
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="" disabled>
              {to.f_type_ph}
            </option>
            {orgTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Tax ID */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="modal-org-taxid" className="text-sm font-semibold text-ink">
            {to.f_taxid}
            <span className="ml-1 text-xs font-normal text-muted">{m.common.optional}</span>
          </label>
          <Input
            id="modal-org-taxid"
            name="taxId"
            type="text"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="ES-12345678"
          />
        </div>

        {/* Contact email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="modal-org-email" className="text-sm font-semibold text-ink">
            {to.f_email}
            <span className="ml-1 text-xs font-normal text-muted">{m.common.optional}</span>
          </label>
          <Input
            id="modal-org-email"
            name="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={to.f_email_ph}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={pending}
            fullWidth
          >
            {m.ui.org_modal_cancel}
          </Button>
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? to.creating : m.ui.org_modal_submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
