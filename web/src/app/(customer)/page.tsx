import { ShopInfoStrip } from "@/components/customer/shop-info-strip";
import { getShopInfo } from "@/lib/shop";

export default async function HomePage() {
  const shop = await getShopInfo();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">{shop.name}</h1>
      <ShopInfoStrip shop={shop} />
    </div>
  );
}
