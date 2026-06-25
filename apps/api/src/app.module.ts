import { Module } from '@nestjs/common';
import { ResourcesModule } from './contexts/resources/infrastructure/resources.module';
import { EmergenciesModule } from './contexts/emergencies/infrastructure/emergencies.module';
import { IdentityModule } from './contexts/identity/infrastructure/identity.module';

@Module({ imports: [IdentityModule, ResourcesModule, EmergenciesModule] })
export class AppModule {}
