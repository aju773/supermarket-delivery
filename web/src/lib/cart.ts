/**
 * The Cart: pure functions over the lines kept on the customer's phone. Each line holds the pack option ID,
 * quantity and the price seen (checked against current prices at checkout), plus what the cart page shows.
 * No imports, so `node --test` can run its tests directly.
 */
export type CartLine = {
  packOptionId: number;
  quantity: number;
  pricePaise: number;
  productId: number;
  productName: string;
  label: string;
  thumbnailUrl: string | null;
};

export type CartItem = Omit<CartLine, "quantity">;

/** The Shop Settings the Cart needs. */
export type ShopTerms = { minimum_order_paise: number; delivery_charge_paise: number };

export type CartSummary = {
  itemCount: number;
  subtotalPaise: number;
  deliveryChargePaise: number;
  totalPaise: number;
  /** How much more the subtotal needs to reach the minimum order; 0 when it's reached. */
  shortfallPaise: number;
};

/** "Tomato 500 g", for button labels. */
export function lineLabel(item: CartItem): string {
  return `${item.productName} ${item.label}`;
}

export function quantityOf(cart: CartLine[], packOptionId: number): number {
  return cart.find((line) => line.packOptionId === packOptionId)?.quantity ?? 0;
}

/** Adds, updates or (below 1) removes the item's line, keeping line order and the latest price seen. */
export function setQuantity(cart: CartLine[], item: CartItem, quantity: number): CartLine[] {
  if (quantity < 1) return cart.filter((line) => line.packOptionId !== item.packOptionId);
  const line = { ...item, quantity };
  if (!cart.some((existing) => existing.packOptionId === item.packOptionId)) return [...cart, line];
  return cart.map((existing) => (existing.packOptionId === item.packOptionId ? line : existing));
}

/** Item count and subtotal at the prices seen, for the cart bar and button. */
export function cartTotals(cart: CartLine[]): { itemCount: number; subtotalPaise: number } {
  return {
    itemCount: cart.reduce((sum, line) => sum + line.quantity, 0),
    subtotalPaise: cart.reduce((sum, line) => sum + line.quantity * line.pricePaise, 0),
  };
}

export function summarise(
  cart: CartLine[],
  shop: ShopTerms,
): CartSummary {
  const { itemCount, subtotalPaise } = cartTotals(cart);
  return {
    itemCount,
    subtotalPaise,
    deliveryChargePaise: shop.delivery_charge_paise,
    totalPaise: subtotalPaise + shop.delivery_charge_paise,
    shortfallPaise: Math.max(0, shop.minimum_order_paise - subtotalPaise),
  };
}

/** What checkout's 409 says changed since a line was added. */
export type CartChange = {
  pack_option_id: number;
  kind: "price_changed" | "out_of_stock" | "unavailable";
  old_price_paise: number | null;
  new_price_paise: number | null;
};

/** The Cart after the customer accepts the changes: new prices taken, lines that can't be ordered removed. */
export function applyChanges(cart: CartLine[], changes: CartChange[]): CartLine[] {
  return cart.flatMap((line) => {
    const change = changes.find((c) => c.pack_option_id === line.packOptionId);
    if (!change) return [line];
    if (change.kind === "price_changed" && change.new_price_paise !== null) return [{ ...line, pricePaise: change.new_price_paise }];
    return [];
  });
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    Number.isInteger(line.packOptionId) &&
    Number.isInteger(line.quantity) &&
    (line.quantity as number) >= 1 &&
    Number.isInteger(line.pricePaise) &&
    Number.isInteger(line.productId) &&
    typeof line.productName === "string" &&
    typeof line.label === "string" &&
    (line.thumbnailUrl === null || typeof line.thumbnailUrl === "string")
  );
}

/** A stored cart, keeping only well-formed lines; anything unreadable is an empty cart. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return [];
  }
}

/** The Cart line details for a catalog pack option. */
export function cartItemFor(
  product: { id: number; name: string; thumbnail_url: string | null },
  option: { id: number; label: string; price_paise: number },
): CartItem {
  return {
    packOptionId: option.id,
    pricePaise: option.price_paise,
    productId: product.id,
    productName: product.name,
    label: option.label,
    thumbnailUrl: product.thumbnail_url,
  };
}
