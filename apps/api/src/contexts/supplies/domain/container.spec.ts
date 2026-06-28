import { Container } from './container';
import { ContainerId } from './container-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from './container-enums';
import {
  ContainerCycleError,
  ContainerSealedError,
  ContainerValidationError,
} from './container-errors';
import { SupplyLine } from './supply-line';
import { Category } from './category';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SHIPMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function line(name = 'Agua', quantity = 10): SupplyLine {
  return SupplyLine.create({
    name,
    quantity,
    unit: 'botellas',
    category: Category.Water,
  });
}

function makeContainer(
  overrides: Partial<Parameters<typeof Container.create>[0]> = {},
): Container {
  return Container.create({
    id: ContainerId.create(),
    code: 'PAL-0001',
    type: ContainerType.Pallet,
    emergencyId: EmergencyId.fromString(EM),
    ...overrides,
  });
}

describe('Container', () => {
  describe('create', () => {
    it('starts open, top-level, with no holder', () => {
      const c = makeContainer();
      expect(c.status).toBe(ContainerStatus.Open);
      expect(c.parentContainerId).toBeNull();
      expect(c.holder).toBeNull();
      expect(c.lines).toHaveLength(0);
    });

    it('rejects an empty code', () => {
      expect(() => makeContainer({ code: '   ' })).toThrow(
        ContainerValidationError,
      );
    });

    it('rejects a non-positive declared weight or volume', () => {
      expect(() => makeContainer({ grossWeightKg: 0 })).toThrow(
        ContainerValidationError,
      );
      expect(() => makeContainer({ grossVolumeM3: -2 })).toThrow(
        ContainerValidationError,
      );
    });

    it('accepts optional initial lines, weight, volume and holder', () => {
      const c = makeContainer({
        lines: [line()],
        grossWeightKg: 120,
        grossVolumeM3: 1.5,
        holder: { type: ContainerHolderType.Resource, id: RESOURCE },
      });
      expect(c.lines).toHaveLength(1);
      expect(c.grossWeightKg).toBe(120);
      expect(c.grossVolumeM3).toBe(1.5);
      expect(c.holder).toEqual({
        type: ContainerHolderType.Resource,
        id: RESOURCE,
      });
    });
  });

  describe('lines', () => {
    it('adds and removes lines while open', () => {
      const c = makeContainer();
      c.addLine(line('Agua'));
      c.addLine(line('Mantas'));
      expect(c.lines).toHaveLength(2);
      c.removeLineAt(0);
      expect(c.lines).toHaveLength(1);
      expect(c.lines[0].name).toBe('Mantas');
    });

    it('rejects removing an out-of-range line', () => {
      const c = makeContainer({ lines: [line()] });
      expect(() => c.removeLineAt(5)).toThrow(ContainerValidationError);
    });
  });

  describe('nesting', () => {
    it('repoints the parent', () => {
      const child = makeContainer({ type: ContainerType.Box });
      const parentId = ContainerId.create();
      child.setParent(parentId);
      expect(child.parentContainerId?.value).toBe(parentId.value);
      child.setParent(null);
      expect(child.parentContainerId).toBeNull();
    });

    it('refuses to be its own parent (cycle guard)', () => {
      const c = makeContainer();
      expect(() => c.setParent(c.id)).toThrow(ContainerCycleError);
    });
  });

  describe('holder', () => {
    it('moves between a resource and a shipment without losing composition', () => {
      const c = makeContainer({ lines: [line()] });
      const parentId = ContainerId.create();
      c.setParent(parentId);
      c.moveToHolder({ type: ContainerHolderType.Resource, id: RESOURCE });
      c.moveToHolder({ type: ContainerHolderType.Shipment, id: SHIPMENT });
      expect(c.holder).toEqual({
        type: ContainerHolderType.Shipment,
        id: SHIPMENT,
      });
      expect(c.parentContainerId?.value).toBe(parentId.value);
      expect(c.lines).toHaveLength(1);
      c.moveToHolder(null);
      expect(c.holder).toBeNull();
    });
  });

  describe('sealing', () => {
    it('open → sealed freezes the lines but not the position', () => {
      const c = makeContainer({ lines: [line()] });
      c.seal();
      expect(c.status).toBe(ContainerStatus.Sealed);
      expect(() => c.addLine(line('Extra'))).toThrow(ContainerSealedError);
      expect(() => c.removeLineAt(0)).toThrow(ContainerSealedError);
      // position / holder still mutable
      const parentId = ContainerId.create();
      expect(() => c.setParent(parentId)).not.toThrow();
      expect(() =>
        c.moveToHolder({ type: ContainerHolderType.Shipment, id: SHIPMENT }),
      ).not.toThrow();
    });

    it('rejects sealing an already sealed container', () => {
      const c = makeContainer();
      c.seal();
      expect(() => c.seal()).toThrow(ContainerSealedError);
    });
  });

  describe('snapshot', () => {
    it('round-trips through a snapshot', () => {
      const c = makeContainer({
        lines: [line('Agua', 5)],
        grossWeightKg: 80,
        holder: { type: ContainerHolderType.Resource, id: RESOURCE },
      });
      const parentId = ContainerId.create();
      c.setParent(parentId);
      c.seal();

      const restored = Container.fromSnapshot(c.toSnapshot());
      expect(restored.toSnapshot()).toEqual(c.toSnapshot());
      expect(restored.parentContainerId?.value).toBe(parentId.value);
      expect(restored.status).toBe(ContainerStatus.Sealed);
      expect(restored.lines[0].name).toBe('Agua');
      expect(restored.holder).toEqual({
        type: ContainerHolderType.Resource,
        id: RESOURCE,
      });
    });
  });
});
