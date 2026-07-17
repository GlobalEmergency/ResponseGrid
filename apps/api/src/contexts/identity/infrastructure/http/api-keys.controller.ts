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
import { ListApiKeys } from '../../application/list-api-keys';
import { ListServiceAccountGrants } from '../../application/list-service-account-grants';
import { ListServiceAccountsByOrg } from '../../application/list-service-accounts-by-org';
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

class ServiceAccountGrantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  scopeType!: string;

  @ApiProperty({ type: String, nullable: true })
  scopeId!: string | null;

  @ApiProperty()
  grantedAt!: string;

  @ApiProperty({ type: String, nullable: true })
  expiresAt!: string | null;
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
    private readonly listApiKeysUseCase: ListApiKeys,
    private readonly listServiceAccountGrantsUseCase: ListServiceAccountGrants,
    private readonly listServiceAccountsByOrg: ListServiceAccountsByOrg,
    @Inject(SERVICE_ACCOUNT_REPOSITORY)
    private readonly serviceAccounts: ServiceAccountRepository,
    @Inject(API_KEY_REPOSITORY) private readonly apiKeys: ApiKeyRepository,
  ) {}

  @Get('service-accounts')
  @UseGuards(RequireAdminGuard)
  @ApiOperation({ summary: 'List all service accounts (platform admin)' })
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

  @Get('organizations/:organizationId/service-accounts')
  @ApiOperation({
    summary: 'List a single organization’s service accounts (org admin)',
  })
  @ApiOkResponse({ type: [ServiceAccountListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'apikey:create required in the org' })
  async listOrgServiceAccounts(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<ServiceAccountListItemDto[]> {
    const user = req.user!;
    const accounts = await this.listServiceAccountsByOrg.execute({
      actor: { principalId: user.id, grants: user.grants },
      organizationId,
    });
    return accounts.map((s) => ({
      id: s.id,
      name: s.name,
      ownerOrganizationId: s.ownerOrganizationId,
      createdByUserId: s.createdByUserId,
      createdAt: s.createdAt,
    }));
  }

  @Get('service-accounts/:serviceAccountId/api-keys')
  @ApiOperation({
    summary: 'List a service account’s keys — metadata only (scoped admin)',
  })
  @ApiOkResponse({ type: [ApiKeyListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'apikey:create required in scope' })
  async listApiKeys(
    @Param('serviceAccountId', ParseUUIDPipe) serviceAccountId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<ApiKeyListItemDto[]> {
    const user = req.user!;
    const keys = await this.listApiKeysUseCase.execute({
      actor: { principalId: user.id, grants: user.grants },
      serviceAccountId,
    });
    const now = Date.now();
    return keys.map((s) => ({
      id: s.id,
      prefix: s.prefix,
      active:
        s.revokedAt === null &&
        (s.expiresAt === null || new Date(s.expiresAt).getTime() > now),
      expiresAt: s.expiresAt,
      lastUsedAt: s.lastUsedAt,
      revokedAt: s.revokedAt,
      createdAt: s.createdAt,
    }));
  }

  @Get('service-accounts/:serviceAccountId/grants')
  @ApiOperation({
    summary:
      'List the grants held by a service account — what its keys can do (scoped admin)',
  })
  @ApiOkResponse({ type: [ServiceAccountGrantDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'apikey:create required in scope' })
  async listServiceAccountGrants(
    @Param('serviceAccountId', ParseUUIDPipe) serviceAccountId: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ): Promise<ServiceAccountGrantDto[]> {
    const user = req.user!;
    const grants = await this.listServiceAccountGrantsUseCase.execute({
      actor: { principalId: user.id, grants: user.grants },
      serviceAccountId,
    });
    return grants.map((g) => ({
      id: g.id,
      roleId: g.roleId,
      scopeType: g.scope.type,
      scopeId: 'id' in g.scope ? g.scope.id : null,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
    }));
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
