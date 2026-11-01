import type { ReactNode } from "react";

import { CustomerTopBar } from "@/components/customer/top-bar";
import { getShopInfo } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const shop = await getShopInfo();
  return (
    <>
      <CustomerTopBar shopName={shop.name} phone={shop.phone} />
      <main className="mx-auto w-full max-w-content px-4 py-4">{children}</main>
    </>
  );
}
