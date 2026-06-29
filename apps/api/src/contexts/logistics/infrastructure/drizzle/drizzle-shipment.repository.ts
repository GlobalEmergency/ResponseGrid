import { and, desc, eq, type SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { shipmentsTable } from './schema';
import {
  ListShipmentsFilter,
  ShipmentRepository,
} from '../../domain/ports/shipment.repository';
import { Shipment, ShipmentSnapshot } from '../../domain/shipment';
import { ShipmentId } from '../../domain/shipment-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { CarrierType, ShipmentStatus } from '../../domain/shipment-enums';

type ShipmentRow = typeof shipmentsTable.$inferSelect;

function rowToSnapshot(row: ShipmentRow): ShipmentSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    originResourceId: row.originResourceId,
    destinationResourceId: row.destinationResourceId,
    items: row.items ?? [],
    containerIds: row.containerIds ?? [],
    assignedCapacityId: row.assignedCapacityId ?? null,
    carrierType: (row.carrierType as CarrierType | null) ?? null,
    carrierId: row.carrierId ?? null,
    manifest: row.manifest ?? null,
    status: row.status as ShipmentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleShipmentRepository implements ShipmentRepository {
  constructor(private readonly db: Db) {}

  async save(shipment: Shipment): Promise<void> {
    const s = shipment.toSnapshot();
    await this.db
      .insert(shipmentsTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
        originResourceId: s.originResourceId,
        destinationResourceId: s.destinationResourceId,
        items: s.items,
        containerIds: s.containerIds,
        assignedCapacityId: s.assignedCapacityId,
        carrierType: s.carrierType,
        carrierId: s.carrierId,
        manifest: s.manifest,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: shipmentsTable.id,
        set: {
          assignedCapacityId: s.assignedCapacityId,
          carrierType: s.carrierType,
          carrierId: s.carrierId,
          status: s.status,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(id: ShipmentId): Promise<Shipment | null> {
    const rows = await this.db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    return Shipment.fromSnapshot(rowToSnapshot(rows[0]));
  }

  async findByEmergency(
    emergencyId: EmergencyId,
    filter: ListShipmentsFilter,
  ): Promise<Shipment[]> {
    const conditions: SQL[] = [
      eq(shipmentsTable.emergencyId, emergencyId.value),
    ];
    if (filter.status !== undefined) {
      conditions.push(eq(shipmentsTable.status, filter.status));
    }

    const rows = await this.db
      .select()
      .from(shipmentsTable)
      .where(and(...conditions))
      .orderBy(desc(shipmentsTable.createdAt));

    return rows.map((r) => Shipment.fromSnapshot(rowToSnapshot(r)));
  }

  async findByCarrier(
    carrierId: string,
    emergencyId: EmergencyId | null,
  ): Promise<Shipment[]> {
    const conditions: SQL[] = [eq(shipmentsTable.carrierId, carrierId)];
    if (emergencyId !== null) {
      conditions.push(eq(shipmentsTable.emergencyId, emergencyId.value));
    }

    const rows = await this.db
      .select()
      .from(shipmentsTable)
      .where(and(...conditions))
      .orderBy(desc(shipmentsTable.createdAt));

    return rows.map((r) => Shipment.fromSnapshot(rowToSnapshot(r)));
  }
}
