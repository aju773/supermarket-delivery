import type { Category } from "@/components/admin/categories";
import { ProductEditor } from "@/components/admin/product-editor";
import { adminGetAll } from "@/lib/admin-session";

export default async function AdminNewProductPage() {
  return <ProductEditor product={null} categories={await adminGetAll<Category>("/categories")} />;
}
