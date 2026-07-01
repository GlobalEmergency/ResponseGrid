import { ResourceView } from './resource-view';
import { VerificationLevel } from '../domain/resource-enums';

/**
 * `contact` is personal data (a phone number / person's line). The public
 * endpoints are anonymous, so we must not broadcast it to scrapers. Policy:
 * the contact is only revealed when the caller is authenticated, OR the
 * resource is an `official` source (an organisation whose public line is
 * meant to be public). Otherwise `contact` is nulled — but `hasContact`
 * stays true so the UI can honestly say "log in to see it" instead of
 * "no contact".
 */
export function redactContact<T extends ResourceView>(
  view: T,
  authenticated: boolean,
): T {
  if (authenticated || view.verificationLevel === VerificationLevel.Official) {
    return view;
  }
  return { ...view, contact: null };
}
