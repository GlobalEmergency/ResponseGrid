/**
 * The display mode of a supply line, derived from its link + input state:
 *  - `catalogue`: a catalogue item is selected (`supplyId` set) → category/unit
 *    are filled and hidden; only quantity is shown.
 *  - `free`: the user committed free text (left the field) with a name but no
 *    selection → the manual fields (category/unit/…) are shown.
 *  - `idle`: still typing (not committed) or empty → no manual fields yet.
 */
export type LineMode = 'idle' | 'catalogue' | 'free';

export function resolveLineMode(
  supplyId: string | null,
  name: string,
  committed: boolean,
): LineMode {
  if (supplyId !== null) return 'catalogue';
  if (committed && name.trim() !== '') return 'free';
  return 'idle';
}
