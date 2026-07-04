import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiKeyAwareThrottlerGuard } from './contexts/identity/infrastructure/http/api-key-aware-throttler.guard';
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
import { LogisticsModule } from './contexts/logistics/infrastructure/logistics.module';
import { VolunteersModule } from './contexts/volunteers/infrastructure/volunteers.module';
import { FilesModule } from './contexts/files/infrastructure/files.module';
import { ReportsModule } from './contexts/reports/infrastructure/reports.module';
import { TemplatesModule } from './contexts/templates/infrastructure/templates.module';
import { NotificationsModule } from './contexts/notifications/infrastructure/notifications.module';
import { AuditModule } from './contexts/audit/infrastructure/audit.module';
import { GroupsModule } from './contexts/groups/infrastructure/groups.module';
import { SuppliesModule } from './contexts/supplies/supplies.module';
import { EventsModule } from './shared/events/events.module';

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
              // Baseline per-IP limit that applies to EVERY route (the guard is
              // registered globally below). Generous enough for legitimate map
              // panning / dashboard use, but caps scraping and volumetric DoS.
              name: 'default',
              ttl: 60_000,
              limit: 200,
            },
            {
              // auth endpoints: 10 requests per 60 seconds per IP
              name: 'auth',
              ttl: 60_000,
              limit: 10,
            },
            {
              // public donation-intake endpoints: 5 requests per 60 seconds per IP
              name: 'intake',
              ttl: 60_000,
              limit: 5,
            },
            {
              // trusted-channel bot auth (#315): 20 req / 60 s, keyed per
              // API-key prefix (not IP) by ApiKeyAwareThrottlerGuard.
              name: 'trusted-auth',
              ttl: 60_000,
              limit: 20,
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
    LogisticsModule,
    VolunteersModule,
    FilesModule,
    ReportsModule,
    AuditModule,
    GroupsModule,
    SuppliesModule,
    EventsModule,
  ],
  providers: [
    // Apply rate limiting to EVERY route by default. Individual routes tighten
    // it with @Throttle (auth, intake, trusted-auth…). Keys API-key traffic by
    // key prefix and everything else by IP (#315). In test env the throttler is
    // configured with an empty ruleset, so this guard is a no-op there.
    { provide: APP_GUARD, useClass: ApiKeyAwareThrottlerGuard },
  ],
})
export class AppModule {}
