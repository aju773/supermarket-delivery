import Link from "next/link";

import { ProductCard } from "@/components/customer/product-card";
import { SearchBox } from "@/components/customer/search-box";
import { ShopInfoStrip } from "@/components/customer/shop-info-strip";
import { getHome } from "@/lib/catalog";
import { getShopInfo } from "@/lib/shop";

export default async function HomePage() {
  const [shop, home] = await Promise.all([getShopInfo(), getHome()]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">{shop.name}</h1>
      <SearchBox />
      <ShopInfoStrip shop={shop} />
      {home.categories.length > 0 && (
        <section aria-labelledby="categories" className="flex flex-col gap-3">
          <h2 id="categories" className="text-xl font-bold">
            Categories
          </h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {home.categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.id}`}
                  className="flex min-h-20 items-center justify-center rounded-lg border-hairline border-border bg-card p-3 text-center font-medium shadow-sm hover:bg-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {home.popular.length > 0 && (
        <section aria-labelledby="popular" className="flex flex-col gap-3">
          <h2 id="popular" className="text-xl font-bold">
            Popular
          </h2>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {home.popular.map((product) => (
              <li key={product.id} className="flex w-40 shrink-0 sm:w-48">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
