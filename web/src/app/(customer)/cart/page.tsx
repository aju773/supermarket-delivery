import type { Metadata } from "next";

import { CartView } from "@/components/customer/cart-view";
import { getShopInfo } from "@/lib/shop";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const shop = await getShopInfo();
  return (
    <CartView
      shop={{ minimum_order_paise: shop.minimum_order_paise, delivery_charge_paise: shop.delivery_charge_paise }}
    />
  );
}
