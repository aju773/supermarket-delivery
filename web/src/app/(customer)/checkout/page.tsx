import type { Metadata } from "next";

import { CheckoutForm } from "@/components/customer/checkout-form";
import { formatOpeningTime } from "@/lib/format";
import { getDeliveryAreas } from "@/lib/orders";
import { getShopInfo } from "@/lib/shop";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [shop, areas] = await Promise.all([getShopInfo(), getDeliveryAreas()]);
  return (
    <CheckoutForm
      shop={{ minimum_order_paise: shop.minimum_order_paise, delivery_charge_paise: shop.delivery_charge_paise }}
      areas={areas}
      closedNotice={
        shop.next_opening_at
          ? `The shop is closed now. Delivery starts from ${formatOpeningTime(shop.next_opening_at, shop.timezone)}.`
          : null
      }
    />
  );
}
