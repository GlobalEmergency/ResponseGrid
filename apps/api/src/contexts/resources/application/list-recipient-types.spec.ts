import { ListRecipientTypes } from './list-recipient-types';
import { RecipientTypeRepository } from '../domain/ports/recipient-type.repository';
import { RecipientType } from '../domain/recipient-type';

describe('ListRecipientTypes', () => {
  it('returns the recipient types from the repository', async () => {
    const types: RecipientType[] = [
      { slug: 'hospital', labelEs: 'Hospital', labelEn: 'Hospital', sort: 10 },
      { slug: 'other', labelEs: 'Otro', labelEn: 'Other', sort: 90 },
    ];
    const repo: RecipientTypeRepository = {
      list: () => Promise.resolve(types),
    };

    const useCase = new ListRecipientTypes(repo);

    await expect(useCase.execute()).resolves.toEqual(types);
  });
});
