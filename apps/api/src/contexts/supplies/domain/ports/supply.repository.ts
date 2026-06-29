import { SupplyStatus } from '../supply';

export interface SupplyCatalogRecord {
  id: string;
  code: string;
  nameEs: string;
  nameEn: string | null;
  categorySlug: string;
  categoryLabelEs: string;
  categoryLabelEn: string;
  defaultUnit: string | null;
  attributes: Record<string, unknown>;
  variantOfId: string | null;
  status: SupplyStatus;
  registrationNotes: string | null;
  aliases: string[];
}

export interface SupplyRepository {
  loadCatalog(): Promise<SupplyCatalogRecord[]>;
}

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');
