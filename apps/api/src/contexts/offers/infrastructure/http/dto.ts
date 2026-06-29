import {
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplyLineDto } from '../../../supplies/infrastructure/http/supply-line.dto';
import { AuthorDto } from '../../../../shared/infrastructure/http/author.dto';

export class OfferLocationDto {
  @ApiProperty({ example: '123 Main Street, Caracas, Venezuela' })
  @IsString()
  @MinLength(2)
  address!: string;

  @ApiProperty({ example: 10.4806, description: 'Latitude (-90 to 90)' })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -66.9036, description: 'Longitude (-180 to 180)' })
  @IsLongitude()
  longitude!: number;
}

export class SubmitOfferDto {
  @ApiProperty({
    type: [SupplyLineDto],
    description: 'Supply lines offered (at least one)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items!: SupplyLineDto[];

  @ApiProperty({ type: OfferLocationDto })
  @ValidateNested()
  @Type(() => OfferLocationDto)
  location!: OfferLocationDto;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target need this offer is directed at (optional)',
  })
  @IsOptional()
  @IsUUID()
  targetNeedId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Organization on whose behalf the offer is made (optional)',
  })
  @IsOptional()
  @IsUUID()
  donorOrganizationId?: string;

  @ApiPropertyOptional({
    example: 'Available for pickup Mon-Fri',
    description: 'Additional notes (optional)',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: AuthorDto,
    description:
      'Restricted contact of the real donor this offer is filed on behalf of ' +
      '(#235). Optional; required when a trusted integration writes via API ' +
      'key. Never exposed on public reads.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorDto)
  author?: AuthorDto;
}

export class MatchOfferDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The need to match this offer against',
  })
  @IsUUID()
  needId!: string;
}

export class DiscardOfferDto {
  @ApiProperty({
    description: 'Motivo del descarte (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Oferta duplicada; ya gestionada en otra entrada',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class EditOfferDto {
  @ApiProperty({
    description: 'Motivo de la edición (obligatorio, para trazabilidad)',
    minLength: 3,
    maxLength: 1000,
    example: 'Se corrigen las líneas de la oferta',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    type: [SupplyLineDto],
    description:
      'Nuevas líneas de la oferta (reemplazan la lista). Omitir para no cambiarlas.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items?: SupplyLineDto[];

  @ApiPropertyOptional({
    description:
      'Nuevas notas. Cadena vacía las borra. Omitir para no cambiarlas.',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
