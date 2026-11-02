import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { adminGet, requireStaffMember } from "@/lib/admin-session";
import type { OrdersSummary } from "@/lib/orders-summary";
import { getShopInfo } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function AdminShellLayout({ children }: { children: ReactNode }) {
  const [staffMember, shop] = await Promise.all([requireStaffMember(), getShopInfo()]);
  // The badge is a nicety: if the count can't be read, the page still loads and the badge catches up by polling.
  const newOrders = await adminGet<OrdersSummary>("/orders/summary").then(
    (summary) => summary.new,
    (error) => {
      // A redirect to log in is not a failure to swallow.
      unstable_rethrow(error);
      return 0;
    },
  );
  return (
    <AdminShell shopName={shop.name} username={staffMember.username} newOrders={newOrders}>
      {children}
    </AdminShell>
  );
}
