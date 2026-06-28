import { RecipientTypeRepository } from '../domain/ports/recipient-type.repository';
import { RecipientType } from '../domain/recipient-type';

/**
 * Lists the recipient-type taxonomy (#62) so clients can offer a selector
 * instead of hardcoding types. Read-only and public.
 */
export class ListRecipientTypes {
  constructor(private readonly repo: RecipientTypeRepository) {}

  execute(): Promise<RecipientType[]> {
    return this.repo.list();
  }
}
