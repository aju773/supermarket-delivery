import "server-only";

/** Shop info from the public API. Money is whole paise; times are "HH:MM" in the shop timezone. */
export type ShopInfo = {
  name: string;
  phone: string;
  minimum_order_paise: number;
  delivery_charge_paise: number;
  opening_time: string;
  closing_time: string;
  timezone: string;
  is_open: boolean;
  next_opening_at: string | null;
};

export async function getShopInfo(): Promise<ShopInfo> {
  // Not cached: "open now" must be current. React dedupes this fetch within one render.
  const response = await fetch(`${process.env.API_INTERNAL_URL}/api/shop`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Shop info request failed: ${response.status}`);
  return response.json();
}
