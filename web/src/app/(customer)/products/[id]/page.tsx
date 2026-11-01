import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddButton } from "@/components/customer/add-button";
import { FinalAmountNote } from "@/components/customer/final-amount-note";
import { ProductPhoto } from "@/components/customer/product-photo";
import { cartItemFor } from "@/lib/cart";
import { getProduct } from "@/lib/catalog";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await getProduct((await params).id))?.name };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).id);
  if (!product) notFound();
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4">
      <Link
        href={`/categories/${product.category.id}`}
        className="inline-flex min-h-tap items-center gap-2 self-start rounded-md"
      >
        <ArrowLeftIcon aria-hidden className="size-5" />
        {product.category.name}
      </Link>
      <div className="rounded-lg border-hairline border-border bg-card p-3 shadow-sm">
        <ProductPhoto src={product.photo_url} />
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground">{product.category.name}</p>
      </div>
      <section aria-labelledby="pack-sizes" className="rounded-lg border-hairline border-border bg-card px-4 shadow-sm">
        <h2 id="pack-sizes" className="pt-4 pb-2 text-lg font-semibold">
          Pack sizes
        </h2>
        <ul>
          {product.pack_options.map((option) => (
            <li
              key={option.id}
              className="flex items-center justify-between gap-3 border-t-hairline border-border py-3 first:border-t-0"
            >
              <span className={cn(!option.in_stock && "text-muted-foreground")}>
                {option.label} · {formatRupees(option.price_paise)}
              </span>
              <AddButton item={cartItemFor(product, option)} inStock={option.in_stock} />
            </li>
          ))}
        </ul>
      </section>
      <FinalAmountNote />
    </div>
  );
}
