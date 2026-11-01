"use client";

import { ArrowLeftIcon, ShoppingCartIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { FinalAmountNote } from "@/components/customer/final-amount-note";
import { ProductPhoto } from "@/components/customer/product-photo";
import { QuantityStepper } from "@/components/customer/quantity-stepper";
import { Button } from "@/components/ui/button";
import { lineLabel, type ShopTerms, summarise } from "@/lib/cart";
import { setCartQuantity, useCart, useCartLoaded } from "@/lib/cart-store";
import { formatRupees } from "@/lib/format";

/** The cart page: lines with counters and remove, totals, the minimum-order message and the checkout button. */
export function CartView({ shop }: { shop: ShopTerms }) {
  const cart = useCart();
  const loaded = useCartLoaded();
  const summary = summarise(cart, shop);
  const canCheckout = summary.shortfallPaise === 0;
  return (
    <div className="mx-auto flex w-full max-w-form flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Back to shop" className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-md">
          <ArrowLeftIcon aria-hidden className="size-6" />
        </Link>
        <h1 className="text-2xl font-bold">Your cart</h1>
      </div>

      {!loaded ? null : cart.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border-hairline border-border bg-card p-8 text-center shadow-sm">
          <ShoppingCartIcon aria-hidden className="size-12 text-muted-foreground" />
          <p>Your cart is empty.</p>
          <Button asChild variant="brand">
            <Link href="/">Browse products</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="rounded-lg border-hairline border-border bg-card px-4 shadow-sm">
            {cart.map((line) => {
              const label = lineLabel(line);
              return (
                <li key={line.packOptionId} className="flex flex-col gap-3 border-t-hairline border-border py-4 first:border-t-0">
                  <div className="flex items-center gap-3">
                    <Link href={`/products/${line.productId}`} className="w-16 shrink-0 rounded-md">
                      <ProductPhoto src={line.thumbnailUrl} />
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{line.productName}</span>
                      <span className="text-sm text-muted-foreground">
                        {line.label} · {formatRupees(line.pricePaise)}
                      </span>
                    </div>
                    <span className="ml-auto font-semibold">{formatRupees(line.quantity * line.pricePaise)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <QuantityStepper
                      quantity={line.quantity}
                      label={label}
                      onChange={(quantity) => setCartQuantity(line, quantity)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${label}`}
                      className="text-muted-foreground"
                      onClick={() => setCartQuantity(line, 0)}
                    >
                      <TrashIcon aria-hidden className="size-4" />
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <dl className="flex flex-col gap-2 rounded-lg border-hairline border-border bg-card p-4 shadow-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items total</dt>
              <dd>{formatRupees(summary.subtotalPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery charge</dt>
              <dd>{formatRupees(summary.deliveryChargePaise)}</dd>
            </div>
            <div className="flex justify-between border-t-hairline border-border pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd>{formatRupees(summary.totalPaise)}</dd>
            </div>
          </dl>

          <FinalAmountNote />

          <div className="sticky bottom-0 z-cartbar -mx-4 flex flex-col gap-2 bg-page px-4 py-3">
            {!canCheckout && (
              <p id="minimum-order" role="status" className="rounded-md bg-error px-3 py-2 text-sm text-error-foreground">
                Minimum order is {formatRupees(shop.minimum_order_paise)}. Add {formatRupees(summary.shortfallPaise)} more
                to check out.
              </p>
            )}
            {!canCheckout ? (
              <Button disabled aria-describedby="minimum-order" className="w-full">
                Checkout · {formatRupees(summary.totalPaise)}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/checkout">Checkout · {formatRupees(summary.totalPaise)}</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
