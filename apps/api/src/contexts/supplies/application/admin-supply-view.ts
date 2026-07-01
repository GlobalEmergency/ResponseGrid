import { Supply } from '../domain/supply';
import { SupplyAlias } from '../domain/supply-alias';

/**
 * Proyección de gestión de un insumo: el agregado completo (incluye `status` y
 * `registrationNotes`, ocultos en la cara pública) más sus alias. La consume
 * únicamente la API admin del catálogo (#222).
 */
export interface AdminSupplyView {
  id: string;
  code: string;
  name: string;
  categorySlug: string;
  defaultUnit: string | null;
  attributes: Record<string, unknown>;
  variantOfId: string | null;
  status: Supply['status'];
  registrationNotes: string | null;
  aliases: string[];
}

export function toAdminSupplyView(
  supply: Supply,
  aliases: SupplyAlias[],
): AdminSupplyView {
  const s = supply.toSnapshot();
  return {
    ...s,
    aliases: aliases.map((a) => a.alias),
  };
}
