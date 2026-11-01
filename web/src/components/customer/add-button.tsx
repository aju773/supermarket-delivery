"use client";

import { QuantityStepper } from "@/components/customer/quantity-stepper";
import { Button } from "@/components/ui/button";
import { type CartItem, lineLabel, quantityOf } from "@/lib/cart";
import { setCartQuantity, useCart } from "@/lib/cart-store";

/** Add to cart, turning into a − 1 + counter once added; "Out of stock" with no button. */
export function AddButton({ item, inStock }: { item: CartItem; inStock: boolean }) {
  const quantity = quantityOf(useCart(), item.packOptionId);
  const label = lineLabel(item);
  if (!inStock) {
    return <span className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Out of stock</span>;
  }
  if (quantity > 0) {
    return <QuantityStepper quantity={quantity} label={label} onChange={(next) => setCartQuantity(item, next)} />;
  }
  return (
    <Button
      variant="outline"
      aria-label={`Add ${label}`}
      className="border-brand text-brand"
      onClick={() => setCartQuantity(item, 1)}
    >
      Add
    </Button>
  );
}
