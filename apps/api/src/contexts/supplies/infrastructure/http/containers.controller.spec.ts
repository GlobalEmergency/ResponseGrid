import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ContainerController } from './containers.controller';
import { CreateContainerDto } from './container-dto';
import { CreateContainer } from '../../application/create-container';
import { AddLineToContainer } from '../../application/add-line-to-container';
import { RemoveLineFromContainer } from '../../application/remove-line-from-container';
import { NestContainer } from '../../application/nest-container';
import { SealContainer } from '../../application/seal-container';
import { MoveContainer } from '../../application/move-container';
import { GetContainer } from '../../application/get-container';
import { ListContainers } from '../../application/list-containers';
import { MembershipRepository } from '../../../identity/domain/ports/membership.repository';
import { Role } from '../../../identity/domain/role';
import { ContainerType } from '../../domain/container-enums';

/**
 * Controller-level authorization tests (mirror of the shipment controller, #150):
 * the container write routes carry no scope-resolvable param, so they gate on
 * coordinator membership of the container's emergency. Pure unit test — no DB.
 */
const EM = '44444444-4444-4444-8444-444444444444';
const CONTAINER = '55555555-5555-4555-8555-555555555555';
const USER = '11111111-1111-4111-8111-111111111111';

type ReqArg = Parameters<ContainerController['create']>[1];

function req(isAdmin = false): ReqArg {
  return {
    user: { id: USER, email: 'coord@example.com', isAdmin },
  } as unknown as ReqArg;
}

function createDto(): CreateContainerDto {
  return { emergencyId: EM, type: ContainerType.Pallet };
}

function setup() {
  const createContainer = {
    execute: jest.fn().mockResolvedValue({ id: CONTAINER, code: 'PAL-0001' }),
  };
  const sealContainer = { execute: jest.fn().mockResolvedValue(undefined) };
  const getContainer = {
    execute: jest.fn().mockResolvedValue({ id: CONTAINER }),
  };
  const noop = { execute: jest.fn() };
  const containerAuthLookup = { findAuthorizationFacts: jest.fn() };
  const membershipRepo = { hasRole: jest.fn() };

  const controller = new ContainerController(
    createContainer as unknown as CreateContainer,
    noop as unknown as AddLineToContainer,
    noop as unknown as RemoveLineFromContainer,
    noop as unknown as NestContainer,
    sealContainer as unknown as SealContainer,
    noop as unknown as MoveContainer,
    getContainer as unknown as GetContainer,
    noop as unknown as ListContainers,
    containerAuthLookup,
    membershipRepo as unknown as MembershipRepository,
  );

  return {
    controller,
    createContainer,
    sealContainer,
    getContainer,
    containerAuthLookup,
    membershipRepo,
  };
}

describe('ContainerController — authorization gating', () => {
  describe('create', () => {
    it('403s a non-coordinator and does not create', async () => {
      const t = setup();
      t.membershipRepo.hasRole.mockResolvedValue(false);
      await expect(
        t.controller.create(createDto(), req()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(t.createContainer.execute).not.toHaveBeenCalled();
    });

    it('creates for a coordinator of the emergency', async () => {
      const t = setup();
      t.membershipRepo.hasRole.mockResolvedValue(true);
      const res = await t.controller.create(createDto(), req());
      expect(res).toEqual({ id: CONTAINER, code: 'PAL-0001' });
      expect(t.createContainer.execute).toHaveBeenCalledTimes(1);
    });

    it('creates for a platform admin without checking membership', async () => {
      const t = setup();
      await t.controller.create(createDto(), req(true));
      expect(t.membershipRepo.hasRole).not.toHaveBeenCalled();
      expect(t.createContainer.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('seal (representative /{id} write)', () => {
    it('404s when the container does not exist', async () => {
      const t = setup();
      t.containerAuthLookup.findAuthorizationFacts.mockResolvedValue(null);
      await expect(t.controller.seal(CONTAINER, req())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(t.sealContainer.execute).not.toHaveBeenCalled();
    });

    it('403s a non-coordinator of the container emergency', async () => {
      const t = setup();
      t.containerAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
      });
      t.membershipRepo.hasRole.mockResolvedValue(false);
      await expect(t.controller.seal(CONTAINER, req())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(t.sealContainer.execute).not.toHaveBeenCalled();
    });

    it('seals for a coordinator of the container emergency', async () => {
      const t = setup();
      t.containerAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
      });
      t.membershipRepo.hasRole.mockResolvedValue(true);
      await t.controller.seal(CONTAINER, req());
      expect(t.sealContainer.execute).toHaveBeenCalledWith({
        containerId: CONTAINER,
      });
    });
  });

  describe('get (reader gate: coordinator or verifier)', () => {
    it('404s an unknown container', async () => {
      const t = setup();
      t.containerAuthLookup.findAuthorizationFacts.mockResolvedValue(null);
      await expect(t.controller.get(CONTAINER, req())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('403s a user who is neither coordinator nor verifier', async () => {
      const t = setup();
      t.containerAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
      });
      t.membershipRepo.hasRole.mockResolvedValue(false);
      await expect(t.controller.get(CONTAINER, req())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns the tree for a verifier of the emergency', async () => {
      const t = setup();
      t.containerAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
      });
      t.membershipRepo.hasRole.mockImplementation(
        (_userId: unknown, _em: string, role: Role) =>
          Promise.resolve(role === Role.Verifier),
      );
      const res = await t.controller.get(CONTAINER, req());
      expect(res).toEqual({ id: CONTAINER });
      expect(t.getContainer.execute).toHaveBeenCalledWith({
        containerId: CONTAINER,
      });
    });
  });
});
