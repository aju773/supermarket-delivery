import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { ProductGrid } from "@/components/customer/product-card";
import { SearchBox } from "@/components/customer/search-box";
import { searchProducts } from "@/lib/catalog";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const products = q ? await searchProducts(q) : [];
  return (
    <div className="flex flex-col gap-4">
      <SearchBox defaultValue={q} />
      {q && (
        <h1 className="text-xl font-bold">
          Results for “{q}”
        </h1>
      )}
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        q && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MagnifyingGlassIcon aria-hidden className="size-10 text-muted-foreground" />
            <p className="font-semibold">No products match “{q}”</p>
            <p className="text-muted-foreground">Check the spelling or try a shorter word.</p>
          </div>
        )
      )}
    </div>
  );
}
