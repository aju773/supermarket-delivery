"use client";

import { CaretDownIcon, XIcon } from "@phosphor-icons/react/ssr";
import * as Dialog from "@radix-ui/react-dialog";

import { AddButton } from "@/components/customer/add-button";
import { ProductPhoto } from "@/components/customer/product-photo";
import { cartItemFor } from "@/lib/cart";
import type { CatalogPackOption, CatalogProduct } from "@/lib/catalog";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The pack chip with ▾ on a card; tapping it slides up a panel listing every pack with its own Add/counter. */
export function PackSizeSheet({ product, shown }: { product: CatalogProduct; shown: CatalogPackOption }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={`Choose pack size for ${product.name}`}
        className="inline-flex min-h-tap items-center gap-1 self-start rounded-sm border-hairline border-border px-2 text-sm"
      >
        {shown.label}
        <CaretDownIcon aria-hidden weight="fill" className="size-3" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-sheet bg-overlay" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-sheet mx-auto flex max-h-dvh w-full max-w-form flex-col overflow-y-auto rounded-t-lg bg-card px-4 pb-4 shadow-md">
          <div aria-hidden className="mx-auto my-3 h-1 w-10 rounded-full bg-border" />
          <div className="flex items-center gap-3 border-b-hairline border-border pb-3">
            <span className="w-12 shrink-0">
              <ProductPhoto src={product.thumbnail_url} />
            </span>
            <Dialog.Title className="text-lg font-semibold">{product.name}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="ml-auto inline-flex min-h-tap min-w-tap items-center justify-center rounded-md"
            >
              <XIcon aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="pt-4 pb-2 text-lg font-semibold">Choose pack size</Dialog.Description>
          <ul>
            {product.pack_options.map((option) => (
              <li
                key={option.id}
                className="flex items-center justify-between gap-3 border-t-hairline border-border py-3 first:border-t-0"
              >
                <span className={cn("flex flex-col", !option.in_stock && "text-muted-foreground")}>
                  <span>{option.label}</span>
                  <span>{formatRupees(option.price_paise)}</span>
                </span>
                <AddButton item={cartItemFor(product, option)} inStock={option.in_stock} />
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
