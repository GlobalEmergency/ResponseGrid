import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { shipmentCodeSequencesTable, shipmentsTable } from './schema';
import {
  ListShipmentsFilter,
  ShipmentRepository,
} from '@globalemergency/warehouse-core/logistics';
import {
  Shipment,
  ShipmentSnapshot,
} from '@globalemergency/warehouse-core/logistics';
import { ShipmentId } from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import {
  CarrierType,
  ShipmentStatus,
} from '@globalemergency/warehouse-core/logistics';

type ShipmentRow = typeof shipmentsTable.$inferSelect;

function rowToSnapshot(row: ShipmentRow): ShipmentSnapshot {
  return {
    id: row.id,
    code: row.code,
    scopeId: row.emergencyId,
    originResourceId: row.originResourceId,
    destinationResourceId: row.destinationResourceId,
    items: row.items ?? [],
    containerIds: row.containerIds ?? [],
    assignedCapacityId: row.assignedCapacityId ?? null,
    carrierType: (row.carrierType as CarrierType | null) ?? null,
    carrierId: row.carrierId ?? null,
    hubId: row.hubId ?? null,
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
        code: s.code,
        emergencyId: s.scopeId,
        originResourceId: s.originResourceId,
        destinationResourceId: s.destinationResourceId,
        items: s.items,
        containerIds: s.containerIds,
        assignedCapacityId: s.assignedCapacityId,
        carrierType: s.carrierType,
        carrierId: s.carrierId,
        hubId: s.hubId,
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

  async nextSequence(scopeId: ScopeId): Promise<number> {
    const [row] = await this.db
      .insert(shipmentCodeSequencesTable)
      .values({ emergencyId: scopeId.value, lastValue: 1 })
      .onConflictDoUpdate({
        target: shipmentCodeSequencesTable.emergencyId,
        set: { lastValue: sql`${shipmentCodeSequencesTable.lastValue} + 1` },
      })
      .returning({ value: shipmentCodeSequencesTable.lastValue });
    if (!row) {
      throw new Error('Shipment code sequence allocation returned no row');
    }
    return row.value;
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

  async findByScope(
    scopeId: ScopeId,
    filter: ListShipmentsFilter,
  ): Promise<Shipment[]> {
    const conditions: SQL[] = [eq(shipmentsTable.emergencyId, scopeId.value)];
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
    scopeId: ScopeId | null,
  ): Promise<Shipment[]> {
    const conditions: SQL[] = [eq(shipmentsTable.carrierId, carrierId)];
    if (scopeId !== null) {
      conditions.push(eq(shipmentsTable.emergencyId, scopeId.value));
    }

    const rows = await this.db
      .select()
      .from(shipmentsTable)
      .where(and(...conditions))
      .orderBy(desc(shipmentsTable.createdAt));

    return rows.map((r) => Shipment.fromSnapshot(rowToSnapshot(r)));
  }
}
