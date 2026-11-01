import type { OrderSummary } from "./admin-orders.ts";

/** How often the Orders page asks for changes. */
export const POLL_INTERVAL_MS = 5000;

/** What GET /admin/orders/changes returns: Orders placed, and cancelled by the customer, since the cursor. */
export type OrderChanges = {
  cursor: number;
  placed: OrderSummary[];
  cancelled: OrderSummary[];
  updated: number[];
};

export type Alert = "placed" | "cancelled";

/** One sound per new Order, then one per cancelled Order. */
export function alertsFor(changes: OrderChanges): Alert[] {
  return [...changes.placed.map((): Alert => "placed"), ...changes.cancelled.map((): Alert => "cancelled")];
}
