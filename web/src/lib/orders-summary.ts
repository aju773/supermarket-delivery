/** What GET /admin/orders/summary returns: today's numbers and the current number of Orders in two statuses. */
export type OrdersSummary = {
  orders_today: number;
  sales_today_paise: number;
  new: number;
  out_for_delivery: number;
};

const BADGE_CAP = 99;

/** The Orders badge text, or null (hide it) when nothing is new. */
export function badgeText(newOrders: number): string | null {
  if (newOrders <= 0) return null;
  return newOrders > BADGE_CAP ? `${BADGE_CAP}+` : String(newOrders);
}
