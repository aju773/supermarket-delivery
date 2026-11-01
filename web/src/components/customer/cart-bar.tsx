"use client";

import { CaretRightIcon, ShoppingCartIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cartTotals } from "@/lib/cart";
import { useCart } from "@/lib/cart-store";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";

export function itemsText(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

/** Phones: "3 items · ₹245 · View cart" fixed to the bottom whenever the Cart isn't empty (not on the cart page). */
export function CartBar() {
  const cart = useCart();
  const pathname = usePathname();
  if (cart.length === 0 || pathname === "/cart") return null;
  const { itemCount, subtotalPaise } = cartTotals(cart);
  return (
    <>
      {/* Keeps the end of the page clear of the bar. */}
      <div aria-hidden className="h-20 md:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-cartbar p-3 md:hidden">
        <Link
          href="/cart"
          className="flex min-h-tap items-center gap-3 rounded-lg bg-brand px-4 py-2 font-semibold text-brand-foreground shadow-md"
        >
          <ShoppingCartIcon aria-hidden className="size-6" />
          <span>
            {itemsText(itemCount)} · {formatRupees(subtotalPaise)}
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            View cart
            <CaretRightIcon aria-hidden weight="bold" className="size-4" />
          </span>
        </Link>
      </div>
    </>
  );
}

/** Wide screens: a cart button with a count in the top bar. */
export function TopBarCartButton({ className }: { className: string }) {
  const cart = useCart();
  const count = cartTotals(cart).itemCount;
  return (
    <Link href="/cart" aria-label={`Cart, ${itemsText(count)}`} className={cn(className, "hidden gap-2 px-2 md:inline-flex")}>
      <ShoppingCartIcon aria-hidden className="size-6" />
      {count > 0 && (
        <span className="min-w-6 rounded-full bg-brand px-2 text-center text-sm font-semibold text-brand-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
