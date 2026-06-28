import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../../domain/offer-enums';

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
  @ApiProperty({ enum: Category, example: Category.Food })
  @IsEnum(Category)
  category!: Category;

  @ApiProperty({
    example: 'Rice bags 25kg',
    description: 'Description of the item being offered',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: 50,
    description: 'Quantity offered (positive integer)',
  })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ example: 'bags', description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  unit?: string;

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
}

export class MatchOfferDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The need to match this offer against',
  })
  @IsUUID()
  needId!: string;
}
