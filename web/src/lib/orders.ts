import "server-only";

import type { PaymentMethod } from "@/lib/customer";
import type { OrderStatus, StatusChange } from "@/lib/order-timeline";

export type DeliveryArea = { id: number; name: string };

export type OrderStatusLine = {
  product_name: string;
  pack_label: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
};

/** One Order as its public status page sees it. Money is whole paise. */
export type PublicOrder = {
  number: number;
  status: OrderStatus;
  placed_at: string;
  timeline: StatusChange[];
  lines: OrderStatusLine[];
  subtotal_paise: number;
  delivery_charge_paise: number;
  total_paise: number;
  payment_method: PaymentMethod;
  shop_phone: string;
  delivery_from: string | null;
};

export async function getDeliveryAreas(): Promise<DeliveryArea[]> {
  const response = await fetch(`${process.env.API_INTERNAL_URL}/api/shop/delivery-areas`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Delivery areas request failed: ${response.status}`);
  return response.json();
}

/** The Order behind a Status Link, or null if the token is unknown. Not cached: the status changes. */
export async function getOrder(token: string): Promise<PublicOrder | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL}/api/orders/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Order request failed: ${response.status}`);
  return response.json();
}
