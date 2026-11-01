import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaffMember } from "@/lib/admin-session";
import { getShopInfo } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function AdminShellLayout({ children }: { children: ReactNode }) {
  const [staffMember, shop] = await Promise.all([requireStaffMember(), getShopInfo()]);
  return (
    <AdminShell shopName={shop.name} username={staffMember.username}>
      {children}
    </AdminShell>
  );
}
