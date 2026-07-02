import { SupplyLineProps, SupplyLineSnapshot } from '../../domain/supply-line';
import { SupplyLineDto, SupplyLineResponseDto } from './supply-line.dto';

/**
 * Single request-DTO → domain-props mapping for a supply line, shared by every
 * endpoint that accepts `SupplyLineDto` so the copies can't drift (one inline
 * copy had already silently dropped `expiresAt`). Add a field to
 * {@link SupplyLineDto} and this is the only place that threads it through.
 */
export function toSupplyLineProps(dto: SupplyLineDto): SupplyLineProps {
  return {
    name: dto.name,
    quantity: dto.quantity,
    unit: dto.unit ?? null,
    category: dto.category,
    supplyId: dto.supplyId ?? null,
    presentation: dto.presentation ?? null,
    expiresAt: dto.expiresAt ?? null,
  };
}

/** Single snapshot → response-DTO mapping, counterpart of {@link toSupplyLineProps}. */
export function toSupplyLineResponse(
  snapshot: SupplyLineSnapshot,
): SupplyLineResponseDto {
  return {
    name: snapshot.name,
    supplyId: snapshot.supplyId,
    quantity: snapshot.quantity,
    unit: snapshot.unit,
    category: snapshot.category,
    presentation: snapshot.presentation ?? null,
    expiresAt: snapshot.expiresAt ?? null,
  };
}
