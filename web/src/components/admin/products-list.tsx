"use client";

import { BasketIcon, MagnifyingGlassIcon, PackageIcon, PlusIcon } from "@phosphor-icons/react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Category } from "@/components/admin/categories";
import { EmptyState } from "@/components/admin/empty-state";
import { FormError } from "@/components/admin/form-error";
import { PageHeader } from "@/components/admin/page-header";
import { inputClass } from "@/components/admin/password-input";
import { Switch } from "@/components/admin/switch";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { adminSend, errorDetail } from "@/lib/admin-api";
import { formatRupees } from "@/lib/format";
import { PRODUCTS_PAGE_SIZE, type PackOption, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

/** The Products page: search and filter, flip stock from the row, and open a product to edit it. */
export function ProductsList({
  products: initialProducts,
  count,
  page,
  q,
  categoryId,
  categories,
}: {
  products: Product[];
  count: number;
  page: number;
  q: string;
  categoryId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState(initialProducts);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filtered = Boolean(q.trim() || categoryId);

  async function setStock(product: Product, option: PackOption, inStock: boolean) {
    setSavingId(option.id);
    setError(null);
    const response = await adminSend("PATCH", `/pack-options/${option.id}`, { in_stock: inStock });
    setSavingId(null);
    if (!response.ok) {
      setError(await errorDetail(response));
      return;
    }
    const saved: PackOption = await response.json();
    setProducts((current) =>
      current.map((each) =>
        each.id === product.id
          ? { ...each, pack_options: each.pack_options.map((o) => (o.id === saved.id ? saved : o)) }
          : each,
      ),
    );
    toast(`${product.name} ${option.label} ${inStock ? "in stock" : "out of stock"}`);
  }

  function pageLink(to: number) {
    const query = new URLSearchParams({ page: String(to) });
    if (q) query.set("q", q);
    if (categoryId) query.set("category", categoryId);
    return `/admin/products?${query}`;
  }

  const addButton = (
    <Button asChild>
      <Link href="/admin/products/new">
        <PlusIcon aria-hidden className="size-4" />
        Add product
      </Link>
    </Button>
  );
  const first = (page - 1) * PRODUCTS_PAGE_SIZE + 1;
  const last = first + products.length - 1;

  return (
    <>
      <PageHeader title="Products" action={addButton} />
      <Form action="/admin/products" role="search" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 my-auto size-5 text-muted-foreground"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Search products"
            placeholder="Search by name or code"
            className={cn(inputClass, "pl-10")}
          />
        </div>
        <select
          name="category"
          defaultValue={categoryId}
          aria-label="Category"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className={cn(inputClass, "sm:w-auto")}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Form>
      <FormError message={error} />

      {products.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={MagnifyingGlassIcon}
            text="No products match."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/products">Clear search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState icon={PackageIcon} text="No products yet." action={addButton} />
        )
      ) : (
        <section aria-label="Products" className="rounded-lg border-hairline border-border bg-card shadow-sm">
          <ul className="flex flex-col">
            {products.map((product) => (
              <li
                key={product.id}
                onClick={() => router.push(`/admin/products/${product.id}`)}
                className="flex cursor-pointer flex-col gap-2 border-border p-4 not-first:border-t-hairline hover:bg-accent md:flex-row md:gap-6"
              >
                <div className="flex min-w-0 items-start gap-3 md:w-2/5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md border-hairline border-border bg-muted">
                    <BasketIcon aria-hidden className="size-6 text-muted-foreground" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className={cn("font-semibold", !product.is_visible && "text-muted-foreground")}
                      >
                        {product.name}
                      </Link>
                      {product.is_featured && <Badge>Featured</Badge>}
                      {!product.is_visible && <Badge>Hidden</Badge>}
                    </span>
                    <span className="text-sm text-muted-foreground">{product.category.name}</span>
                  </span>
                </div>
                <ul className="flex flex-1 flex-col">
                  {product.pack_options.map((option) => (
                    <li key={option.id} className="flex items-center gap-3">
                      <span className="w-20 shrink-0">{option.label}</span>
                      <span className="hidden flex-1 font-mono text-xs text-muted-foreground sm:inline">
                        {option.code}
                      </span>
                      <span className="flex-1 font-semibold sm:w-20 sm:flex-none">{formatRupees(option.price_paise)}</span>
                      <span
                        aria-hidden
                        className={cn("text-xs", option.in_stock ? "font-medium" : "text-muted-foreground")}
                      >
                        {option.in_stock ? "In stock" : "Out of stock"}
                      </span>
                      <span onClick={(event) => event.stopPropagation()}>
                        <Switch
                          label={`${product.name} ${option.label} in stock`}
                          checked={option.in_stock}
                          disabled={savingId === option.id}
                          onChange={(inStock) => setStock(product, option, inStock)}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {count > 0 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {first}–{last} of {count}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" asChild>
                <Link href={pageLink(page - 1)}>Previous</Link>
              </Button>
            )}
            {last < count && (
              <Button variant="outline" asChild>
                <Link href={pageLink(page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-sm border-hairline border-border bg-muted px-2 text-xs font-normal text-foreground">
      {children}
    </span>
  );
}
