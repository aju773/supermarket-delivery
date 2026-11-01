import type { Category } from "@/components/admin/categories";
import { ProductsList } from "@/components/admin/products-list";
import { adminGet, adminGetAll } from "@/lib/admin-session";
import type { Product } from "@/lib/products";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q = "", category = "", page = "1" } = await searchParams;
  const query = new URLSearchParams({ page: String(Math.max(1, Number.parseInt(page, 10) || 1)) });
  if (q.trim()) query.set("q", q.trim());
  if (/^\d+$/.test(category)) query.set("category_id", category);
  const [products, categories] = await Promise.all([
    adminGet<{ items: Product[]; count: number }>(`/products?${query}`),
    adminGetAll<Category>("/categories"),
  ]);
  return (
    <ProductsList
      key={query.toString()}
      products={products.items}
      count={products.count}
      page={Number(query.get("page"))}
      q={q}
      categoryId={query.get("category_id") ?? ""}
      categories={categories}
    />
  );
}
