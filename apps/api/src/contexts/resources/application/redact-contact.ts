import { ResourceView } from './resource-view';
import { VerificationLevel } from '../domain/resource-enums';

/**
 * `contact` and `manager` are personal data (a phone number / a person's line,
 * and a person's name for citizen-submitted points). The public endpoints are
 * anonymous, so we must not broadcast them to scrapers. Policy: they are only
 * revealed when the caller is authenticated, OR the resource is an `official`
 * source (an organisation whose public line/manager is meant to be public).
 * Otherwise both are nulled — but `hasContact` stays true so the UI can
 * honestly say "log in to see it" instead of "no contact".
 */
export function redactContact<T extends ResourceView>(
  view: T,
  authenticated: boolean,
): T {
  if (authenticated || view.verificationLevel === VerificationLevel.Official) {
    return view;
  }
  return { ...view, contact: null, manager: null };
}
