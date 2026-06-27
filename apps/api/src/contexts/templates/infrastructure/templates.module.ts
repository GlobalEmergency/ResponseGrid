import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { TemplatesController } from './http/templates.controller';
import { CreateTemplate } from '../application/create-template';
import { ListTemplates } from '../application/list-templates';
import { DeleteTemplate } from '../application/delete-template';
import {
  TEMPLATE_REPOSITORY,
  TemplateRepository,
} from '../domain/ports/template.repository';
import { DrizzleTemplateRepository } from './drizzle/drizzle-template.repository';
import { IdentityModule } from '../../identity/infrastructure/identity.module';

const templateRepositoryProvider = {
  provide: TEMPLATE_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): TemplateRepository => new DrizzleTemplateRepository(db),
};

const createTemplateProvider = {
  provide: CreateTemplate,
  inject: [TEMPLATE_REPOSITORY],
  useFactory: (repo: TemplateRepository) => new CreateTemplate(repo),
};

const listTemplatesProvider = {
  provide: ListTemplates,
  inject: [TEMPLATE_REPOSITORY],
  useFactory: (repo: TemplateRepository) => new ListTemplates(repo),
};

const deleteTemplateProvider = {
  provide: DeleteTemplate,
  inject: [TEMPLATE_REPOSITORY],
  useFactory: (repo: TemplateRepository) => new DeleteTemplate(repo),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [TemplatesController],
  providers: [
    templateRepositoryProvider,
    createTemplateProvider,
    listTemplatesProvider,
    deleteTemplateProvider,
  ],
  exports: [TEMPLATE_REPOSITORY],
})
export class TemplatesModule {}
