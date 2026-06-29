import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShipmentController } from './shipment.controller';
import { CreateShipmentDto, AssignCapacityToShipmentDto } from './shipment-dto';
import { Category } from '../../../supplies/domain/category';
import { CreateShipment } from '../../application/create-shipment';
import { AssignCapacityToShipment } from '../../application/assign-capacity-to-shipment';
import { MarkShipmentInTransit } from '../../application/mark-shipment-in-transit';
import { ConfirmShipmentDelivery } from '../../application/confirm-shipment-delivery';
import { CancelShipment } from '../../application/cancel-shipment';
import { ListShipments } from '../../application/list-shipments';
import { GetMyShipments } from '../../application/get-my-shipments';
import { SuggestCapacitiesForShipment } from '../../application/suggest-capacities-for-shipment';
import { MembershipRepository } from '../../../identity/domain/ports/membership.repository';

/**
 * Regression tests for #150: the shipment write routes carry no scope-resolvable
 * param, so the global PermissionGuard resolved to the platform scope and 403'd
 * a legitimate emergency coordinator. They now gate on coordinator membership of
 * the shipment's emergency (mirroring markInTransit/deliver). Pure controller
 * unit test — no DB.
 */
const EM = '44444444-4444-4444-8444-444444444444';
const SHIP = '55555555-5555-4555-8555-555555555555';
const USER = '11111111-1111-4111-8111-111111111111';

type ReqArg = Parameters<ShipmentController['create']>[1];

function req(isAdmin = false): ReqArg {
  return {
    user: { id: USER, email: 'coord@example.com', isAdmin },
  } as unknown as ReqArg;
}

function createDto(): CreateShipmentDto {
  return {
    emergencyId: EM,
    originResourceId: '22222222-2222-4222-8222-222222222222',
    destinationResourceId: '33333333-3333-4333-8333-333333333333',
    items: [{ name: 'agua', quantity: 1, category: Category.Water }],
  };
}

const ASSIGN_DTO = {
  assignedCapacityId: '66666666-6666-4666-8666-666666666666',
} as AssignCapacityToShipmentDto;

function setup() {
  const createShipment = { execute: jest.fn().mockResolvedValue({ id: SHIP }) };
  const assignCapacity = { execute: jest.fn().mockResolvedValue(undefined) };
  const cancelShipment = { execute: jest.fn().mockResolvedValue(undefined) };
  const suggest = { execute: jest.fn().mockResolvedValue([]) };
  const noop = { execute: jest.fn() };
  const shipmentAuthLookup = { findAuthorizationFacts: jest.fn() };
  const membershipRepo = { hasRole: jest.fn() };

  const controller = new ShipmentController(
    createShipment as unknown as CreateShipment,
    assignCapacity as unknown as AssignCapacityToShipment,
    noop as unknown as MarkShipmentInTransit,
    noop as unknown as ConfirmShipmentDelivery,
    cancelShipment as unknown as CancelShipment,
    noop as unknown as ListShipments,
    noop as unknown as GetMyShipments,
    suggest as unknown as SuggestCapacitiesForShipment,
    shipmentAuthLookup,
    membershipRepo as unknown as MembershipRepository,
  );

  return {
    controller,
    createShipment,
    assignCapacity,
    cancelShipment,
    suggest,
    shipmentAuthLookup,
    membershipRepo,
  };
}

describe('ShipmentController — authorization gating (#150)', () => {
  describe('create', () => {
    it('403s a non-coordinator and does not create', async () => {
      const t = setup();
      t.membershipRepo.hasRole.mockResolvedValue(false);
      await expect(
        t.controller.create(createDto(), req()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(t.createShipment.execute).not.toHaveBeenCalled();
    });

    it('creates for a coordinator of the emergency', async () => {
      const t = setup();
      t.membershipRepo.hasRole.mockResolvedValue(true);
      const res = await t.controller.create(createDto(), req());
      expect(res).toEqual({ id: SHIP });
      expect(t.createShipment.execute).toHaveBeenCalledTimes(1);
    });

    it('creates for a platform admin without checking membership', async () => {
      const t = setup();
      await t.controller.create(createDto(), req(true));
      expect(t.membershipRepo.hasRole).not.toHaveBeenCalled();
      expect(t.createShipment.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('assignCapacity', () => {
    it('404s when the shipment does not exist', async () => {
      const t = setup();
      t.shipmentAuthLookup.findAuthorizationFacts.mockResolvedValue(null);
      await expect(
        t.controller.assignCapacity(SHIP, ASSIGN_DTO, req()),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(t.assignCapacity.execute).not.toHaveBeenCalled();
    });

    it('403s a non-coordinator of the shipment emergency', async () => {
      const t = setup();
      t.shipmentAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
        carrierId: null,
      });
      t.membershipRepo.hasRole.mockResolvedValue(false);
      await expect(
        t.controller.assignCapacity(SHIP, ASSIGN_DTO, req()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(t.assignCapacity.execute).not.toHaveBeenCalled();
    });

    it('assigns for a coordinator of the shipment emergency', async () => {
      const t = setup();
      t.shipmentAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
        carrierId: null,
      });
      t.membershipRepo.hasRole.mockResolvedValue(true);
      await t.controller.assignCapacity(SHIP, ASSIGN_DTO, req());
      expect(t.assignCapacity.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel and capacitySuggestions gate by coordinator too', () => {
    it('cancel 403s a non-coordinator', async () => {
      const t = setup();
      t.shipmentAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
        carrierId: null,
      });
      t.membershipRepo.hasRole.mockResolvedValue(false);
      await expect(t.controller.cancel(SHIP, req())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(t.cancelShipment.execute).not.toHaveBeenCalled();
    });

    it('capacitySuggestions returns for a coordinator', async () => {
      const t = setup();
      t.shipmentAuthLookup.findAuthorizationFacts.mockResolvedValue({
        emergencyId: EM,
        carrierId: null,
      });
      t.membershipRepo.hasRole.mockResolvedValue(true);
      const res = await t.controller.capacitySuggestions(SHIP, req());
      expect(res).toEqual([]);
      expect(t.suggest.execute).toHaveBeenCalledWith({ shipmentId: SHIP });
    });
  });
});
