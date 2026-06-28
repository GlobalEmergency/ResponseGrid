/**
 * NeedItem is the shared SupplyLine value object (a line of aid material).
 * The needs context keeps the local `NeedItem` name, but there is a single
 * definition in the supplies (insumos) context reused by needs, offers and
 * resources.
 */
export {
  SupplyLine as NeedItem,
  SupplyLineValidationError as NeedItemValidationError,
} from '../../supplies/domain/supply-line';
export type {
  SupplyLineProps as NeedItemProps,
  SupplyLineSnapshot as NeedItemSnapshot,
} from '../../supplies/domain/supply-line';
