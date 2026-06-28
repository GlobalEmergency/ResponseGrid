import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  AUDIT_REPOSITORY,
  AuditRepository,
} from '../domain/ports/audit.repository';
import { DrizzleAuditRepository } from './drizzle/drizzle-audit.repository';
import { AuditInterceptor } from './http/audit.interceptor';
import { AuditController } from './http/audit.controller';
import { EmergencyAuditController } from './http/emergency-audit.controller';

const auditRepositoryProvider = {
  provide: AUDIT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): AuditRepository => new DrizzleAuditRepository(db),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [AuditController, EmergencyAuditController],
  providers: [
    auditRepositoryProvider,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AuditModule {}
