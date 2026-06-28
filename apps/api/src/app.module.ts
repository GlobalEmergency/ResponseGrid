import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './shared/database.module';
import { ResourcesModule } from './contexts/resources/infrastructure/resources.module';
import { EmergenciesModule } from './contexts/emergencies/infrastructure/emergencies.module';
import { IdentityModule } from './contexts/identity/infrastructure/identity.module';
import { NeedsModule } from './contexts/needs/infrastructure/needs.module';
import { OrganizationsModule } from './contexts/organizations/infrastructure/organizations.module';
import { AccreditationModule } from './contexts/accreditation/infrastructure/accreditation.module';
import { GeocodingModule } from './contexts/geocoding/infrastructure/geocoding.module';
import { MetricsModule } from './contexts/metrics/infrastructure/metrics.module';
import { OffersModule } from './contexts/offers/infrastructure/offers.module';
import { VolunteersModule } from './contexts/volunteers/infrastructure/volunteers.module';
import { FilesModule } from './contexts/files/infrastructure/files.module';
import { ReportsModule } from './contexts/reports/infrastructure/reports.module';
import { TemplatesModule } from './contexts/templates/infrastructure/templates.module';
import { NotificationsModule } from './contexts/notifications/infrastructure/notifications.module';
import { AuditModule } from './contexts/audit/infrastructure/audit.module';

// In test environments (NODE_ENV=test) the throttler is disabled to avoid
// breaking e2e tests that perform many login requests in quick succession.
const isTestEnv = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ThrottlerModule.forRoot(
      isTestEnv
        ? [] // disabled — no throttle in test
        : [
            {
              // auth endpoints: 10 requests per 60 seconds per IP
              name: 'auth',
              ttl: 60_000,
              limit: 10,
            },
          ],
    ),
    DatabaseModule,
    IdentityModule,
    NotificationsModule,
    ResourcesModule,
    TemplatesModule,
    EmergenciesModule,
    NeedsModule,
    OrganizationsModule,
    AccreditationModule,
    GeocodingModule,
    MetricsModule,
    OffersModule,
    VolunteersModule,
    FilesModule,
    ReportsModule,
    AuditModule,
  ],
})
export class AppModule {}
