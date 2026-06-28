import { RecipientType } from '../recipient-type';

export const RECIPIENT_TYPE_REPOSITORY = Symbol('RECIPIENT_TYPE_REPOSITORY');

export interface RecipientTypeRepository {
  /** All recipient types ordered by `sort` ascending. */
  list(): Promise<RecipientType[]>;
}
