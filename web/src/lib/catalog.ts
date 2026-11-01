import "server-only";

/** A Pack Option as the public catalog returns it. Out-of-stock options are returned but can't be ordered. */
export type CatalogPackOption = { id: number; label: string; price_paise: number; in_stock: boolean };

export type CatalogCategory = { id: number; name: string };

/** A visible Product with only its visible Pack Options, in display order. */
export type CatalogProduct = {
  id: number;
  name: string;
  category: CatalogCategory;
  pack_options: CatalogPackOption[];
  photo_url: string | null;
  thumbnail_url: string | null;
};

export type Home = { categories: CatalogCategory[]; popular: CatalogProduct[] };
export type CategoryListing = { category: CatalogCategory; categories: CatalogCategory[]; products: CatalogProduct[] };

// Short caching: the catalog changes when staff edit it, and a minute's delay is fine. The options are
// explicit because the customer layout is force-dynamic (for "open now"), which would otherwise skip the cache.
const REVALIDATE_SECONDS = 60;

/** The parsed JSON, or null on 404. */
async function getCatalog<T>(path: string): Promise<T | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL}/api/catalog${path}`, {
    cache: "force-cache",
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
  return response.json();
}

export async function getHome(): Promise<Home> {
  const home = await getCatalog<Home>("/home");
  if (!home) throw new Error("Catalog home not found");
  return home;
}

export function getCategoryListing(id: string): Promise<CategoryListing | null> {
  return getCatalog(`/categories/${encodeURIComponent(id)}`);
}

export function getProduct(id: string): Promise<CatalogProduct | null> {
  return getCatalog(`/products/${encodeURIComponent(id)}`);
}

export async function searchProducts(q: string): Promise<CatalogProduct[]> {
  return (await getCatalog<CatalogProduct[]>(`/search?q=${encodeURIComponent(q)}`)) ?? [];
}
