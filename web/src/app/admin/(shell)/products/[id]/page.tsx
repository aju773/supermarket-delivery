import { notFound } from "next/navigation";

import type { Category } from "@/components/admin/categories";
import { ProductEditor } from "@/components/admin/product-editor";
import { adminGet, adminGetAll } from "@/lib/admin-session";
import type { Product } from "@/lib/products";

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [product, categories] = await Promise.all([
    adminGet<Product>(`/products/${id}`),
    adminGetAll<Category>("/categories"),
  ]);
  return <ProductEditor product={product} categories={categories} />;
}
