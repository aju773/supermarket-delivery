import type { PaymentMethod } from "@/lib/customer";
import type { OrderStatus } from "@/lib/order-timeline";

export const ORDERS_PAGE_SIZE = 25;

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** How each status reads in an Order's history: "Confirmed by priya". */
export const HISTORY_LABELS: Record<OrderStatus, string> = {
  new: "Placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Cash", upi: "UPI" };

/** One row of the staff orders list. Money is whole paise. */
export type OrderSummary = {
  number: number;
  customer_name: string;
  area: string;
  total_paise: number;
  placed_at: string;
  status: OrderStatus;
  is_after_hours: boolean;
  call_to_confirm: boolean;
};

export type AdminOrderLine = {
  pack_option_id: number;
  product_name: string;
  pack_label: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
};

/** One status change; `by` is a Staff Member's username or "customer". */
export type HistoryEntry = { status: OrderStatus; at: string; by: string };

/** One Order as the staff order detail page sees it. */
export type AdminOrder = OrderSummary & {
  phone: string;
  address: string;
  landmark: string;
  note: string;
  payment_method: PaymentMethod;
  lines: AdminOrderLine[];
  /** The lines as the customer submitted them; never changed by edits. */
  original_request: Omit<AdminOrderLine, "line_total_paise">[];
  subtotal_paise: number;
  delivery_charge_paise: number;
  history: HistoryEntry[];
};

export function isOrderStatus(value: string): value is OrderStatus {
  return value in STATUS_LABELS;
}
