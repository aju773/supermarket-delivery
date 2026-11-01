import { Categories, type Category } from "@/components/admin/categories";
import { adminGetAll } from "@/lib/admin-session";

export default async function AdminCategoriesPage() {
  return <Categories categories={await adminGetAll<Category>("/categories")} />;
}
