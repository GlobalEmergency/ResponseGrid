/**
 * Shared Kernel — Address coarsening helper.
 *
 * Pure function that strips the most identifying part of a postal address (the
 * street line — name + number + unit) while keeping the coarse locality context
 * (neighbourhood / city / region). Used for the public view of location-
 * sensitive needs: the coordinates are already jittered, so returning the exact
 * street address would defeat that protection and disclose an individual's home.
 *
 * Heuristic: addresses are conventionally written most-specific-first, comma
 * separated ("Calle X #123, Apt 4B, Chacao, Caracas"). We drop the first
 * segment (the street line) and keep the rest. A single-segment address is
 * assumed to BE a street line and is removed entirely, since we cannot separate
 * street from locality safely.
 *
 * No framework/infra dependency — this is a pure domain concern.
 */
export function coarsenAddress(address: string | null): string | null {
  if (address === null) return null;

  const segments = address
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Nothing usable, or only the street line → hide entirely.
  if (segments.length <= 1) return null;

  // Drop the leading street line, keep the coarser locality context.
  return segments.slice(1).join(', ');
}
