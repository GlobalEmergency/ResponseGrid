import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * AuthorDto — the single request shape for the optional `author` block
 * attached to a delegated write (need / offer / resource) made by a trusted
 * service-account API key on behalf of a real person (issue #235).
 *
 * Every sub-field is optional and `author` itself is optional, so the existing
 * JWT-user flow is unaffected. The data is self-reported and unverified
 * (`verified` defaults to false) and is stored RESTRICTED — never surfaced on
 * public reads.
 */
export class AuthorDto {
  @ApiPropertyOptional({ example: 'María P.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'maria@example.com', maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ example: '+58 412 1234567', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ApiPropertyOptional({
    example: 'Contactar por la tarde; vive en el 3er piso',
    maxLength: 2000,
    description: 'Free-text contact / context note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Whether the integrating source verified this identity (e.g. OTP). ' +
      'Defaults to false — public anonymous capture is unverified.',
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    example: 'terremotovenezuela.app',
    maxLength: 200,
    description: 'Which integration contributed this author',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;
}

/**
 * AuthorResponseDto — the response shape for `author`, only ever serialised on
 * coordinator/admin-gated reads (never public).
 */
export class AuthorResponseDto {
  @ApiPropertyOptional({ nullable: true, type: String, example: 'María P.' })
  name!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'maria@example.com',
  })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '+58…' })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiProperty({ example: false })
  verified!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'terremotovenezuela.app',
  })
  source!: string | null;
}
