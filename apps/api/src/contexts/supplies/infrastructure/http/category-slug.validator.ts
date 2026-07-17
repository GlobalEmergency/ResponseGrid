import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Validate } from 'class-validator';
import type {
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidatorConstraint } from 'class-validator';
import {
  CategorySlug,
  CategoryValidationError,
  CORE_CATEGORY_SLUGS,
} from '@globalemergency/warehouse-core/kernel';

/**
 * Validación *de formato* del slug de categoría en la frontera HTTP, alineada
 * con {@link CategorySlug} del kernel (trim + lowercase + snake_case).
 *
 * Sustituye al antiguo `@IsEnum(Category)`: la categoría dejó de ser un enum
 * cerrado para pasar a ser un slug validado (string) data-driven. La pertenencia
 * a la taxonomía concreta (tabla `categories` / `CategoryRegistry`) se comprueba
 * en el caso de uso, no aquí — este validador solo garantiza el formato.
 *
 * `CORE_CATEGORY_SLUGS` se documenta como conjunto de ejemplo en Swagger, pero
 * el tipo del contrato es `string` (abierto), no un enum cerrado.
 */
@ValidatorConstraint({ name: 'isCategorySlug', async: false })
export class IsCategorySlugConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      CategorySlug.of(value);
      return true;
    } catch (err) {
      if (err instanceof CategoryValidationError) return false;
      throw err;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe ser un slug de categoría válido (lowercase snake_case, p.ej. ${CORE_CATEGORY_SLUGS.slice(0, 3).join(', ')})`;
  }
}

/** Metadatos de Swagger compartidos para el campo `category`. */
const CATEGORY_API_META = {
  type: String,
  example: 'water',
  description:
    'Slug de categoría de material (data-driven, lowercase snake_case). ' +
    `Los slugs core son: ${CORE_CATEGORY_SLUGS.join(', ')}. ` +
    'El conjunto es abierto: la taxonomía puede crecer vía datos (tabla `categories`).',
} as const;

/** Decorador para el campo `category` requerido de un {@link SupplyLineDto}. */
export function CategorySlugProperty(): PropertyDecorator {
  return applyDecorators(
    ApiProperty(CATEGORY_API_META),
    IsString(),
    Validate(IsCategorySlugConstraint),
  );
}

/** Variante opcional del campo `category` (filtros, respuestas). */
export function OptionalCategorySlugProperty(): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional(CATEGORY_API_META),
    IsString(),
    Validate(IsCategorySlugConstraint),
  );
}
