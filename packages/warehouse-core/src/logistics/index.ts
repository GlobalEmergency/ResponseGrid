/**
 * logistics — capacidad de transporte y expediciones/traslados. Aggregates
 * `TransportCapacity` (oferta de movimiento) y `Shipment` (el trabajo de mover
 * carga: transferencia interna o expedición con transportista), sus VOs de
 * capacidad/cobertura/ventana, el matching capacidad↔envío, el evento
 * `ShipmentDelivered` y los ports de repositorio.
 *
 * Opera contra `ScopeId` (tenencia opaca). Dominio puro: el bus de eventos, la
 * autorización, el gating de estado y los lookups de ubicación/contenedor los
 * aporta cada host (ports que se quedan en el consumidor).
 */
export * from './shipment.js';
export * from './shipment-id.js';
export * from './shipment-enums.js';
export * from './shipment-errors.js';
export * from './shipment-code.js';
export * from './shipment-match-criteria.js';
export * from './transport-capacity.js';
export * from './transport-capacity-id.js';
export * from './transport-capacity-enums.js';
export * from './transport-capacity-errors.js';
export * from './capacity.js';
export * from './capacity-window.js';
export * from './coverage.js';
export * from './window-overlap.js';
export * from './capacity-match.js';
export * from './events/shipment-delivered.event.js';
export * from './ports/shipment.repository.js';
export * from './ports/transport-capacity.repository.js';
