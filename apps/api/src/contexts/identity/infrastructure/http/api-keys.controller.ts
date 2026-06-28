import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
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
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateServiceAccount } from '../../application/create-service-account';
import { IssueApiKey } from '../../application/issue-api-key';
import { RevokeApiKey } from '../../application/revoke-api-key';
import { SERVICE_ACCOUNT_REPOSITORY } from '../../domain/ports/service-account.repository';
import type { ServiceAccountRepository } from '../../domain/ports/service-account.repository';
import { API_KEY_REPOSITORY } from '../../domain/ports/api-key.repository';
import type { ApiKeyRepository } from '../../domain/ports/api-key.repository';
import { CreateServiceAccountDto, IssueApiKeyDto } from './api-keys-dto';
import { ApiKeyExceptionFilter } from './api-key-exception.filter';
import { JwtAuthGuard, AuthenticatedUser } from './jwt-auth.guard';
import { RequireAdminGuard } from './require-admin.guard';

class ServiceAccountListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  ownerOrganizationId!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;
}

class ApiKeyListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Non-secret lookup prefix' })
  prefix!: string;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastUsedAt!: string | null;

  @ApiProperty({ type: String, nullable: true })
  revokedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

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
    @Inject(SERVICE_ACCOUNT_REPOSITORY)
    private readonly serviceAccounts: ServiceAccountRepository,
    @Inject(API_KEY_REPOSITORY) private readonly apiKeys: ApiKeyRepository,
  ) {}

  @Get('service-accounts')
  @UseGuards(RequireAdminGuard)
  @ApiOperation({ summary: 'List service accounts (admin)' })
  @ApiOkResponse({ type: [ServiceAccountListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async listServiceAccounts(): Promise<ServiceAccountListItemDto[]> {
    const accounts = await this.serviceAccounts.listAll();
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      ownerOrganizationId: a.ownerOrganizationId,
      createdByUserId: a.createdByUserId,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  @Get('service-accounts/:serviceAccountId/api-keys')
  @UseGuards(RequireAdminGuard)
  @ApiOperation({
    summary: 'List a service account’s keys — metadata only (admin)',
  })
  @ApiOkResponse({ type: [ApiKeyListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  async listApiKeys(
    @Param('serviceAccountId', ParseUUIDPipe) serviceAccountId: string,
  ): Promise<ApiKeyListItemDto[]> {
    const keys = await this.apiKeys.listByServiceAccount(serviceAccountId);
    const now = new Date();
    return keys.map((k) => {
      const s = k.toSnapshot();
      return {
        id: s.id,
        prefix: s.prefix,
        active: k.isActive(now),
        expiresAt: s.expiresAt,
        lastUsedAt: s.lastUsedAt,
        revokedAt: s.revokedAt,
        createdAt: s.createdAt,
      };
    });
  }

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
