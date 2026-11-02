import assert from "node:assert/strict";
import { test } from "node:test";

import type { CartLine } from "./cart.ts";
import { addedText, addReorderLines, type ReorderLine, skippedText } from "./reorder.ts";

const tomato: ReorderLine = {
  pack_option_id: 1,
  product_id: 10,
  product_name: "Tomato",
  pack_label: "500 g",
  price_paise: 2200,
  quantity: 2,
  thumbnail_url: "/media/tomato.webp",
};
const atta: ReorderLine = { ...tomato, pack_option_id: 2, product_id: 11, product_name: "Atta", pack_label: "5 kg", price_paise: 24500, quantity: 1, thumbnail_url: null };

const inCart: CartLine = {
  packOptionId: 1,
  quantity: 3,
  pricePaise: 2000,
  productId: 10,
  productName: "Tomato",
  label: "500 g",
  thumbnailUrl: null,
};

test("reordered lines are added to an empty cart at the current price", () => {
  assert.deepEqual(addReorderLines([], [tomato, atta]), [
    { packOptionId: 1, quantity: 2, pricePaise: 2200, productId: 10, productName: "Tomato", label: "500 g", thumbnailUrl: "/media/tomato.webp" },
    { packOptionId: 2, quantity: 1, pricePaise: 24500, productId: 11, productName: "Atta", label: "5 kg", thumbnailUrl: null },
  ]);
});

test("a reordered line already in the cart adds to its quantity and takes the current price", () => {
  const cart = addReorderLines([inCart], [tomato]);
  assert.deepEqual(cart, [{ ...inCart, quantity: 5, pricePaise: 2200, thumbnailUrl: "/media/tomato.webp" }]);
});

test("the cart is unchanged when nothing can be reordered", () => {
  assert.deepEqual(addReorderLines([inCart], []), [inCart]);
});

test("the added text counts items, not lines", () => {
  assert.equal(addedText([tomato, atta]), "Added 3 items to your cart.");
  assert.equal(addedText([atta]), "Added 1 item to your cart.");
  assert.equal(addedText([]), "Nothing could be added to your cart.");
});

test("the skipped text names each line and why", () => {
  assert.equal(skippedText([]), null);
  assert.equal(
    skippedText([
      { product_name: "Milk", pack_label: "500 ml", reason: "out_of_stock" },
      { product_name: "Ghee", pack_label: "1 kg", reason: "unavailable" },
    ]),
    "Skipped: Milk 500 ml (out of stock), Ghee 1 kg (no longer sold).",
  );
});
