'use client';

import { useTransition } from 'react';
import { deleteTemplateAction } from './actions';
import { Button } from '@/components/atoms/button';

interface DeleteTemplateButtonProps {
  templateId: string;
}

export function DeleteTemplateButton({ templateId }: DeleteTemplateButtonProps) {
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
      {pending ? 'Eliminando…' : 'Eliminar'}
    </Button>
  );
}
