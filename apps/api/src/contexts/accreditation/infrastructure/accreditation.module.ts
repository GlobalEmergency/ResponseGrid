import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  ACCREDITATION_REPOSITORY,
  AccreditationRepository,
} from '../domain/ports/accreditation.repository';
import { DrizzleAccreditationRepository } from './drizzle/drizzle-accreditation.repository';
import { GrantAccreditation } from '../application/grant-accreditation';
import { RevokeAccreditation } from '../application/revoke-accreditation';
import { ListAccreditations } from '../application/list-accreditations';
import { AccreditationsController } from './http/accreditations.controller';

const accreditationRepositoryProvider = {
  provide: ACCREDITATION_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): AccreditationRepository =>
    new DrizzleAccreditationRepository(db),
};

const grantProvider = {
  provide: GrantAccreditation,
  inject: [ACCREDITATION_REPOSITORY],
  useFactory: (repo: AccreditationRepository) => new GrantAccreditation(repo),
};

const revokeProvider = {
  provide: RevokeAccreditation,
  inject: [ACCREDITATION_REPOSITORY],
  useFactory: (repo: AccreditationRepository) => new RevokeAccreditation(repo),
};

const listProvider = {
  provide: ListAccreditations,
  inject: [ACCREDITATION_REPOSITORY],
  useFactory: (repo: AccreditationRepository) => new ListAccreditations(repo),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [AccreditationsController],
  providers: [
    accreditationRepositoryProvider,
    grantProvider,
    revokeProvider,
    listProvider,
  ],
  exports: [ACCREDITATION_REPOSITORY],
})
export class AccreditationModule {}
