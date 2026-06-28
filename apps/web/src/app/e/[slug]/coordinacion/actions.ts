'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, clearToken, authHeaders } from '@/lib/auth';
import { getT } from '@/i18n/server';

/**
 * Matches an open offer to a need (coordinator only).
 */
export async function matchOffer(
  offerId: string,
  needId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.POST('/offers/{offerId}/match', {
    params: { path: { offerId } },
    body: { needId },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_match };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.coord.err_offer_not_open };
    }
    if (response.status === 404) {
      return { status: 'error', message: t.coord.err_not_found_offer_need };
    }
    return { status: 'error', message: t.coord.err_match_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

/**
 * Marks a matched offer as fulfilled (coordinator only).
 */
export async function fulfillOffer(
  offerId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.POST('/offers/{offerId}/fulfill', {
    params: { path: { offerId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_fulfill };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.coord.err_offer_not_assigned };
    }
    return { status: 'error', message: t.coord.err_fulfill_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

/**
 * Cancels an offer (coordinator only in this context).
 */
export async function cancelOffer(
  offerId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.POST('/offers/{offerId}/cancel', {
    params: { path: { offerId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_cancel };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.coord.err_offer_cannot_cancel };
    }
    return { status: 'error', message: t.coord.err_cancel_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Verifies a resource and immediately publishes it.
 * The verification level is derived server-side by the backend — no level
 * is sent in the request body.
 * The token is read server-side from the httpOnly cookie — never exposed to
 * the client.
 */
export async function verifyAndPublish(
  resourceId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const headers = authHeaders(token);

  // The schema still carries VerifyResourceDto but the backend now accepts
  // an empty body and derives the level itself. We bypass the typed client
  // here to avoid sending a stale `level` field.
  const apiBase = process.env.API_URL ?? 'http://localhost:3000';
  const verifyResponse = await fetch(
    `${apiBase}/resources/${resourceId}/verify`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}',
    },
  );

  if (!verifyResponse.ok) {
    if (verifyResponse.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    return {
      status: 'error',
      message: t.coord.err_verify_failed,
    };
  }

  const { error: publishError, response: publishResponse } = await api.POST(
    '/resources/{resourceId}/publish',
    {
      params: { path: { resourceId } },
      headers,
    },
  );

  if (publishError !== undefined) {
    if (publishResponse.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    return {
      status: 'error',
      message: t.coord.err_publish_resource_failed,
    };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

/**
 * Validates a pending need (moves it to "validated" state so it appears publicly).
 */
export async function validateNeed(
  needId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const headers = authHeaders(token);

  const { error, response } = await api.POST('/needs/{needId}/validate', {
    params: { path: { needId } },
    headers,
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    return {
      status: 'error',
      message: t.coord.err_validate_failed,
    };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

/**
 * Renews an expired need (resets expiresAt to now+48h) — coordinator only.
 */
export async function renewNeed(
  needId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.POST('/needs/{needId}/renew', {
    params: { path: { needId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_renew };
    }
    if (response.status === 404) {
      return { status: 'error', message: t.coord.err_request_not_found };
    }
    return { status: 'error', message: t.coord.err_renew_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  return { status: 'success' };
}

/**
 * Clears the auth cookie and redirects to the login page.
 */
export async function logout(): Promise<never> {
  await clearToken();
  redirect('/login');
}

/**
 * Pauses intake for the given emergency (coordinator only).
 * Returns an ActionResult — does not redirect, so the coordinator stays on
 * the page and sees the outcome.
 */
export async function pauseEmergency(
  emergencyId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.POST('/emergencies/{emergencyId}/pause', {
    params: { path: { emergencyId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_pause };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.coord.err_already_paused };
    }
    return { status: 'error', message: t.coord.err_pause_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  revalidatePath(`/e/${slug}`);
  return { status: 'success' };
}

/**
 * Resumes intake for a paused emergency (coordinator only).
 */
export async function resumeEmergency(
  emergencyId: string,
  slug: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.POST('/emergencies/{emergencyId}/resume', {
    params: { path: { emergencyId } },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_resume };
    }
    if (response.status === 409) {
      return { status: 'error', message: t.coord.err_not_paused };
    }
    return { status: 'error', message: t.coord.err_resume_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  revalidatePath(`/e/${slug}`);
  return { status: 'success' };
}

/**
 * Updates the official announcement for an emergency (coordinator only).
 */
export async function publishAnnouncement(
  emergencyId: string,
  slug: string,
  message: string,
): Promise<ActionResult> {
  const token = await getToken();
  if (token === null) {
    redirect(`/login?next=/e/${slug}/coordinacion`);
  }

  const { t } = await getT();

  const { error, response } = await api.PUT('/emergencies/{emergencyId}/announcement', {
    params: { path: { emergencyId } },
    body: { message },
    headers: authHeaders(token),
  });

  if (error !== undefined) {
    if (response.status === 401) {
      await clearToken();
      redirect(`/login?next=/e/${slug}/coordinacion`);
    }
    if (response.status === 403) {
      return { status: 'error', message: t.coord.err_no_permission_announce };
    }
    return { status: 'error', message: t.coord.err_announce_failed };
  }

  revalidatePath(`/e/${slug}/coordinacion`);
  revalidatePath(`/e/${slug}`);
  return { status: 'success' };
}
