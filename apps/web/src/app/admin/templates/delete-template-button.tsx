'use client';

import { useTransition } from 'react';
import { deleteTemplateAction } from './actions';
import { Button } from '@/components/atoms/button';
import { useLocale } from '@/i18n/locale-context';
import { getMessages } from '@/i18n';

interface DeleteTemplateButtonProps {
  templateId: string;
}

export function DeleteTemplateButton({ templateId }: DeleteTemplateButtonProps) {
  const t = getMessages(useLocale()).templates;
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteTemplateAction(templateId);
    });
  }

  return (
    <Button
      type="button"
      variant="danger-outline"
      size="sm"
      disabled={pending}
      onClick={handleDelete}
    >
      {pending ? t.deleting : t.delete}
    </Button>
  );
}
