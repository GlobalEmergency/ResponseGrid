import { asc } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { recipientTypesTable } from './recipient-types.schema';
import { RecipientTypeRepository } from '../../domain/ports/recipient-type.repository';
import { RecipientType } from '../../domain/recipient-type';

export class DrizzleRecipientTypeRepository implements RecipientTypeRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<RecipientType[]> {
    const rows = await this.db
      .select()
      .from(recipientTypesTable)
      .orderBy(asc(recipientTypesTable.sort));
    return rows.map((r) => ({
      slug: r.slug,
      labelEs: r.labelEs,
      labelEn: r.labelEn,
      sort: r.sort,
    }));
  }
}
