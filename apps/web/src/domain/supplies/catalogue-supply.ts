import type { components } from '@responsegrid/api-client';

type SupplyDto = components['schemas']['SupplyDto'];

/**
 * CatalogueSupply — the frontend domain view of a catalogue item (insumo),
 * mapped from the wire `SupplyDto`. Anti-corruption layer: the UI depends on
 * THIS shape, not on the OpenAPI schema, so API field changes stop at
 * `fromSupplyDto`. `name` arrives already localized from the API.
 */
export interface CatalogueSupply {
  id: string;
  code: string;
  name: string;
  categorySlug: string;
  defaultUnit: string | null;
  aliases: string[];
}

/** ACL: map the wire `SupplyDto` to the domain `CatalogueSupply`. */
export function fromSupplyDto(dto: SupplyDto): CatalogueSupply {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    categorySlug: dto.categorySlug,
    defaultUnit: dto.defaultUnit ?? null,
    aliases: dto.aliases,
  };
}
