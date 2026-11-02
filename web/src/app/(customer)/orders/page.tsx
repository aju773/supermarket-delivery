import type { Metadata } from "next";

import { MyOrders } from "@/components/customer/my-orders";
import { getShopInfo } from "@/lib/shop";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false },
};

/** The Orders placed from this phone: the list itself is read from the phone's saved tokens in the browser. */
export default async function MyOrdersPage() {
  const shop = await getShopInfo();
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">My orders</h1>
        <p className="text-muted-foreground">Orders placed from this phone</p>
      </div>
      <MyOrders timeZone={shop.timezone} />
    </div>
  );
}
