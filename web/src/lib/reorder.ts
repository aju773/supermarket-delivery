/**
 * Reorder: what the API's reorder lookup returns, and how it goes into the Cart. No imports beyond the Cart's
 * types, so `node --test` can run its tests directly.
 */
import { type CartLine, setQuantity } from "./cart.ts";

/** A line of the Order that can be ordered again, at today's price. */
export type ReorderLine = {
  pack_option_id: number;
  product_id: number;
  product_name: string;
  pack_label: string;
  price_paise: number;
  quantity: number;
  thumbnail_url: string | null;
};

/** A line of the Order that can't be ordered again. */
export type SkippedLine = { product_name: string; pack_label: string; reason: "unavailable" | "out_of_stock" };

export type ReorderLookup = { lines: ReorderLine[]; skipped: SkippedLine[] };

const REASONS = { unavailable: "no longer sold", out_of_stock: "out of stock" };

/** The Cart with the lines added: a pack already in the Cart gains the quantity, and takes the current price. */
export function addReorderLines(cart: CartLine[], lines: ReorderLine[]): CartLine[] {
  return lines.reduce((current, line) => {
    const existing = current.find((cartLine) => cartLine.packOptionId === line.pack_option_id)?.quantity ?? 0;
    return setQuantity(
      current,
      {
        packOptionId: line.pack_option_id,
        pricePaise: line.price_paise,
        productId: line.product_id,
        productName: line.product_name,
        label: line.pack_label,
        thumbnailUrl: line.thumbnail_url,
      },
      existing + line.quantity,
    );
  }, cart);
}

export function addedText(lines: ReorderLine[]): string {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (count === 0) return "Nothing could be added to your cart.";
  return `Added ${count} ${count === 1 ? "item" : "items"} to your cart.`;
}

/** "Skipped: Milk 500 ml (out of stock), ..." or null when every line was added. */
export function skippedText(skipped: SkippedLine[]): string | null {
  if (skipped.length === 0) return null;
  const lines = skipped.map((line) => `${line.product_name} ${line.pack_label} (${REASONS[line.reason]})`);
  return `Skipped: ${lines.join(", ")}.`;
}
