import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryRow } from "@/components/customer/category-row";
import { ProductGrid } from "@/components/customer/product-card";
import { getCategoryListing } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getCategoryListing((await params).id);
  return { title: listing?.category.name };
}

export default async function CategoryPage({ params }: Props) {
  const listing = await getCategoryListing((await params).id);
  if (!listing) notFound();
  const count = listing.products.length;
  return (
    <div className="flex flex-col gap-4">
      <CategoryRow categories={listing.categories} currentId={listing.category.id} />
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{listing.category.name}</h1>
        <p className="text-sm text-muted-foreground">{count === 1 ? "1 item" : `${count} items`}</p>
      </div>
      {count > 0 ? (
        <ProductGrid products={listing.products} />
      ) : (
        <p className="text-muted-foreground">Nothing here yet.</p>
      )}
    </div>
  );
}
