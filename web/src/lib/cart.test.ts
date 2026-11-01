import assert from "node:assert/strict";
import { test } from "node:test";

import { type CartLine, parseCart, quantityOf, setQuantity, summarise } from "./cart.ts";

const tomato: CartLine = {
  packOptionId: 1,
  quantity: 2,
  pricePaise: 2000,
  productId: 10,
  productName: "Tomato",
  label: "500 g",
  thumbnailUrl: null,
};
const atta: CartLine = { ...tomato, packOptionId: 2, quantity: 1, pricePaise: 24500, productName: "Atta", label: "5 kg" };

test("setting a quantity adds, updates and removes lines", () => {
  const { quantity: _, ...item } = tomato;
  let cart = setQuantity([], item, 1);
  assert.deepEqual(cart, [{ ...tomato, quantity: 1 }]);
  cart = setQuantity(cart, item, 3);
  assert.equal(quantityOf(cart, 1), 3);
  cart = setQuantity(cart, item, 0);
  assert.deepEqual(cart, []);
  assert.equal(quantityOf(cart, 1), 0);
});

test("setting a quantity keeps the line in place and records the latest price seen", () => {
  const cart = setQuantity([tomato, atta], { ...tomato, pricePaise: 2200 }, 5);
  assert.deepEqual(
    cart.map((line) => [line.packOptionId, line.quantity, line.pricePaise]),
    [
      [1, 5, 2200],
      [2, 1, 24500],
    ],
  );
});

test("summary counts items and adds the delivery charge", () => {
  const summary = summarise([tomato, atta], { minimum_order_paise: 20000, delivery_charge_paise: 2000 });
  assert.deepEqual(summary, {
    itemCount: 3,
    subtotalPaise: 28500,
    deliveryChargePaise: 2000,
    totalPaise: 30500,
    shortfallPaise: 0,
  });
});

test("summary says how much more is needed below the minimum order", () => {
  const summary = summarise([tomato], { minimum_order_paise: 20000, delivery_charge_paise: 2000 });
  assert.equal(summary.shortfallPaise, 16000);
});

test("stored carts are parsed defensively", () => {
  assert.deepEqual(parseCart(JSON.stringify([tomato])), [tomato]);
  assert.deepEqual(parseCart(null), []);
  assert.deepEqual(parseCart("not json"), []);
  assert.deepEqual(parseCart('{"a":1}'), []);
  // Malformed lines and non-positive quantities are dropped; the rest survive.
  assert.deepEqual(parseCart(JSON.stringify([tomato, { packOptionId: "x" }, { ...atta, quantity: 0 }])), [tomato]);
});
