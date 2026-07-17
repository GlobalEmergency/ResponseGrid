/**
 * El VO `Capacity` se promovió al `kernel` (lo comparten `inventory` y
 * `logistics` sin dependencia cruzada). Se re-exporta aquí para que los
 * consumidores de logistics sigan importándolo `from './capacity.js'` sin
 * cambios.
 */
export { Capacity, type CapacityProps } from '../kernel/capacity.js';
