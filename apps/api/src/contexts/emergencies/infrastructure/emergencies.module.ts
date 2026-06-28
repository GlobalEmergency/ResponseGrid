import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { EmergenciesController } from './http/emergencies.controller';
import { CreateEmergency } from '../application/create-emergency';
import { ListActiveEmergencies } from '../application/list-active-emergencies';
import { ListMyEmergencies } from '../application/list-my-emergencies';
import { GetEmergencyBySlug } from '../application/get-emergency-by-slug';
import { PauseEmergency } from '../application/pause-emergency';
import { ResumeEmergency } from '../application/resume-emergency';
import { PublishAnnouncement } from '../application/publish-announcement';
import { CreateEmergencyFromTemplate } from '../application/create-emergency-from-template';
import {
  EMERGENCY_REPOSITORY,
  EmergencyRepository,
} from '../domain/ports/emergency.repository';
import { DrizzleEmergencyRepository } from './drizzle/drizzle-emergency.repository';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  TEMPLATE_REPOSITORY,
  TemplateRepository,
} from '../../templates/domain/ports/template.repository';
import { TemplatesModule } from '../../templates/infrastructure/templates.module';

const emergencyRepositoryProvider = {
  provide: EMERGENCY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): EmergencyRepository =>
    new DrizzleEmergencyRepository(db),
};

const createEmergencyProvider = {
  provide: CreateEmergency,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new CreateEmergency(repo),
};

const listActiveProvider = {
  provide: ListActiveEmergencies,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new ListActiveEmergencies(repo),
};

const listMyProvider = {
  provide: ListMyEmergencies,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new ListMyEmergencies(repo),
};

const getBySlugProvider = {
  provide: GetEmergencyBySlug,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new GetEmergencyBySlug(repo),
};

const pauseEmergencyProvider = {
  provide: PauseEmergency,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new PauseEmergency(repo),
};

const resumeEmergencyProvider = {
  provide: ResumeEmergency,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new ResumeEmergency(repo),
};

const publishAnnouncementProvider = {
  provide: PublishAnnouncement,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new PublishAnnouncement(repo),
};

const createFromTemplateProvider = {
  provide: CreateEmergencyFromTemplate,
  inject: [EMERGENCY_REPOSITORY, TEMPLATE_REPOSITORY],
  useFactory: (
    emergencyRepo: EmergencyRepository,
    templateRepo: TemplateRepository,
  ) => new CreateEmergencyFromTemplate(emergencyRepo, templateRepo),
};

@Module({
  imports: [DatabaseModule, IdentityModule, TemplatesModule],
  controllers: [EmergenciesController],
  providers: [
    emergencyRepositoryProvider,
    createEmergencyProvider,
    listActiveProvider,
    listMyProvider,
    getBySlugProvider,
    pauseEmergencyProvider,
    resumeEmergencyProvider,
    publishAnnouncementProvider,
    createFromTemplateProvider,
  ],
})
export class EmergenciesModule {}
