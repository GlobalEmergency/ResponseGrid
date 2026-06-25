'use server';

import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import type { components } from '@reliefhub/api-client';

type VerificationLevel = Exclude<
  components['schemas']['VerifyResourceDto']['level'],
  'unverified'
>;

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Verifies a resource and immediately publishes it in a single action.
 *
 * Architecture note: we combine verify+publish here because the backend only
 * exposes the *pending* (unverified) queue via GET
 * /emergencies/{id}/coordination/queue. There is no endpoint that lists
 * resources in the "verified but not yet published" state, so offering a
 * two-step flow in the UI would require the coordinator to navigate away and
 * come back — a poor UX with no data to show. A future endpoint (e.g.
 * GET /emergencies/{id}/coordination/verified) would let us split the steps
 * and give finer-grained control; that is a known debt item.
 */
export async function verifyAndPublish(
  resourceId: string,
  level: VerificationLevel,
): Promise<ActionResult> {
  const { error: verifyError } = await api.POST(
    '/resources/{resourceId}/verify',
    {
      params: { path: { resourceId } },
      body: { level },
    },
  );

  if (verifyError !== undefined) {
    return {
      status: 'error',
      message: 'No se pudo verificar el recurso. Inténtalo de nuevo.',
    };
  }

  const { error: publishError } = await api.POST(
    '/resources/{resourceId}/publish',
    {
      params: { path: { resourceId } },
    },
  );

  if (publishError !== undefined) {
    return {
      status: 'error',
      message:
        'Recurso verificado, pero no se pudo publicar. Contacta al administrador.',
    };
  }

  revalidatePath('/coordinacion');
  return { status: 'success' };
}
