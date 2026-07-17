/**
 * DomainEvent — contrato mínimo de un evento de dominio del núcleo de almacén.
 *
 * Estructura genérica (nombre, instante, id del aggregate, payload) que cada
 * host publica por su propio bus (BullMQ en ResponseGrid, el que sea en el WMS
 * standalone). El paquete solo define la forma; el transporte es del host.
 */
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
}
