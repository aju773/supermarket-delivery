import Link from "next/link";

import { AddButton } from "@/components/customer/add-button";
import { PackSizeSheet } from "@/components/customer/pack-size-sheet";
import { ProductPhoto } from "@/components/customer/product-photo";
import { cartItemFor } from "@/lib/cart";
import type { CatalogProduct } from "@/lib/catalog";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Photo, name, one pack (with ▾ when there are more) and its price. Shows the first in-stock pack if any. */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const options = product.pack_options;
  const option = options.find((candidate) => candidate.in_stock) ?? options[0];
  return (
    <article className="flex flex-col gap-2 rounded-lg border-hairline border-border bg-card p-3 shadow-sm">
      <Link href={`/products/${product.id}`} className="flex flex-col gap-2 rounded-md">
        <ProductPhoto src={product.thumbnail_url} dimmed={!option.in_stock} />
        <h3 className={cn("font-semibold leading-tight", !option.in_stock && "text-muted-foreground")}>
          {product.name}
        </h3>
      </Link>
      {options.length > 1 ? (
        <PackSizeSheet product={product} shown={option} />
      ) : (
        <span className="text-sm text-muted-foreground">{option.label}</span>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className={cn("font-bold", !option.in_stock && "text-muted-foreground")}>
          {formatRupees(option.price_paise)}
        </span>
        <AddButton item={cartItemFor(product, option)} inStock={option.in_stock} />
      </div>
    </article>
  );
}

/** Two columns on phones, up to six on wide screens. */
export const productGridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className={productGridClass}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
