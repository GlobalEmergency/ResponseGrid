import {
  ArrayMaxSize,
  ArrayMinSize,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplyLineDto } from '../../../supplies/infrastructure/http/supply-line.dto';
import { MAX_DONATION_INTAKE_LINES } from '../../domain/donation-intake-enums';

@ValidatorConstraint({ name: 'donorContactRequired', async: false })
class DonorContactRequiredConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as {
      donorPhone?: string | null;
      donorEmail?: string | null;
    };
    const phone = obj.donorPhone?.trim() ?? '';
    const email = obj.donorEmail?.trim() ?? '';
    return phone.length > 0 || email.length > 0;
  }

  defaultMessage(): string {
    return 'At least one of donorPhone or donorEmail is required';
  }
}

export class CreateDonationIntakeDto {
  @ApiProperty({ format: 'uuid', description: 'Target collection point' })
  @IsUUID()
  targetResourceId!: string;

  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(1)
  @Validate(DonorContactRequiredConstraint)
  donorName!: string;

  @ApiPropertyOptional({
    example: '+52 55 1234 5678',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  donorPhone?: string | null;

  @ApiPropertyOptional({
    example: 'maria@example.com',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  donorEmail?: string | null;

  @ApiProperty({ type: [SupplyLineDto] })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_DONATION_INTAKE_LINES)
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items!: SupplyLineDto[];
}

export class LookupDonorByContactDto {
  @ApiPropertyOptional({
    example: '+52 55 1234 5678',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  donorPhone?: string | null;

  @ApiPropertyOptional({
    example: 'maria@example.com',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @Validate(DonorContactRequiredConstraint)
  donorEmail?: string | null;
}

export class UpdateDonationIntakeDto {
  @ApiProperty({ example: 'ACO-7F3K' })
  @IsString()
  @IsNotEmpty()
  intakeCode!: string;

  @ApiProperty({ example: 'María López' })
  @IsString()
  @MinLength(1)
  @Validate(DonorContactRequiredConstraint)
  donorName!: string;

  @ApiPropertyOptional({
    example: '+52 55 1234 5678',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  donorPhone?: string | null;

  @ApiPropertyOptional({
    example: 'maria@example.com',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  donorEmail?: string | null;

  @ApiProperty({ type: [SupplyLineDto] })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_DONATION_INTAKE_LINES)
  @ValidateNested({ each: true })
  @Type(() => SupplyLineDto)
  items!: SupplyLineDto[];
}

export class ReceiveDonationIntakeDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  volunteerNotes?: string | null;

  @ApiPropertyOptional({
    description: 'File key from POST /files',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  evidenceFileKey?: string | null;
}

export class RejectDonationIntakeDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  volunteerNotes?: string | null;
}

export class MarkDonationIntakeIncompleteDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  volunteerNotes?: string | null;
}

export class SearchDonationIntakesQueryDto {
  @ApiProperty({
    example: 'ACO-7F3K',
    description: 'Phone, email, code or name',
  })
  @IsString()
  @IsNotEmpty()
  q!: string;
}
