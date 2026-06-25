import { Module } from '@nestjs/common';
import { ResourcesModule } from './contexts/resources/infrastructure/resources.module';
import { EmergenciesModule } from './contexts/emergencies/infrastructure/emergencies.module';

@Module({ imports: [ResourcesModule, EmergenciesModule] })
export class AppModule {}
