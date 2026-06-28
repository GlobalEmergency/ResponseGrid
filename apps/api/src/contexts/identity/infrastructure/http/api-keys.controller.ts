import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateServiceAccount } from '../../application/create-service-account';
import { IssueApiKey } from '../../application/issue-api-key';
import { RevokeApiKey } from '../../application/revoke-api-key';
import { CreateServiceAccountDto, IssueApiKeyDto } from './api-keys-dto';
import { ApiKeyExceptionFilter } from './api-key-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';

class ServiceAccountResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

class IssuedApiKeyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'The full secret key — shown once; store it now',
  })
  apiKey!: string;

  @ApiProperty()
  prefix!: string;
}

/**
 * Service-account and API-key management — performed by *users* (e.g. org
 * admins), hence the JwtAuthGuard. The keys themselves authenticate elsewhere
 * via ApiKeyAuthGuard. See docs/features/13 §8.
 */
@ApiTags('service-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(ApiKeyExceptionFilter)
@Controller()
export class ApiKeysController {
  constructor(
    private readonly createServiceAccount: CreateServiceAccount,
    private readonly issueApiKey: IssueApiKey,
    private readonly revokeApiKey: RevokeApiKey,
  ) {}

  @Post('service-accounts')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a service account (machine principal)' })
  @ApiCreatedResponse({ type: ServiceAccountResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'apikey:create required' })
  async create(
    @Body() dto: CreateServiceAccountDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<{ id: string }> {
    const user = req.user!;
    return this.createServiceAccount.execute({
      actor: { principalId: user.id, grants: user.grants },
      name: dto.name,
      ownerOrganizationId: dto.ownerOrganizationId ?? null,
    });
  }

  @Post('service-accounts/:serviceAccountId/api-keys')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Issue an API key for a service account (secret shown once)',
  })
  @ApiCreatedResponse({ type: IssuedApiKeyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'apikey:create required' })
  async issue(
    @Param('serviceAccountId', ParseUUIDPipe) serviceAccountId: string,
    @Body() dto: IssueApiKeyDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<IssuedApiKeyResponseDto> {
    const user = req.user!;
    const issued = await this.issueApiKey.execute({
      actor: { principalId: user.id, grants: user.grants },
      serviceAccountId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return { id: issued.id, apiKey: issued.plaintext, prefix: issued.prefix };
  }

  @Delete('api-keys/:keyId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiNoContentResponse({ description: 'Key revoked' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'apikey:revoke required' })
  async revoke(
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<void> {
    const user = req.user!;
    await this.revokeApiKey.execute({
      actor: { principalId: user.id, grants: user.grants },
      keyId,
    });
  }
}
