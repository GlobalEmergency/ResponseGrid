import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    DatabaseModule,
    IdentityModule,
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
  ],
})
export class AppModule {}
