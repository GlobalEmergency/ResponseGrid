import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceAccountDto {
  @ApiProperty({ description: 'Human-readable name for the service account' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Owning organization; omit for a platform-level account',
  })
  @IsOptional()
  @IsUUID()
  ownerOrganizationId?: string;
}

export class IssueApiKeyDto {
  @ApiPropertyOptional({ description: 'ISO 8601 expiry for the key' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
