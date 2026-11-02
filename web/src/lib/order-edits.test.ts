import assert from "node:assert/strict";
import { test } from "node:test";

import { editedSubtotal, originalRequestChanges } from "./order-edits.ts";

const tomato = {
  pack_option_id: 1,
  product_name: "Tomato",
  pack_label: "1 kg",
  unit_price_paise: 4000,
};
const milk = {
  pack_option_id: 2,
  product_name: "Milk",
  pack_label: "500 ml",
  unit_price_paise: 2850,
};
const rice = {
  pack_option_id: 3,
  product_name: "Rice",
  pack_label: "5 kg",
  unit_price_paise: 30000,
};

test("no changes when the lines match the Original Request", () => {
  const original = [
    { ...tomato, quantity: 2 },
    { ...milk, quantity: 3 },
  ];
  assert.deepEqual(originalRequestChanges(original, original), []);
});

test("a different quantity, a removed line and an added line are each described", () => {
  const original = [
    { ...tomato, quantity: 2 },
    { ...milk, quantity: 3 },
  ];
  const current = [
    { ...tomato, quantity: 1 },
    { ...rice, quantity: 1 },
  ];
  assert.deepEqual(originalRequestChanges(original, current), [
    "Tomato 1 kg × 2 → changed to × 1",
    "Milk 500 ml × 3 → removed",
    "Rice 5 kg × 1 → added",
  ]);
});

test("a price difference alone is not a change", () => {
  const original = [{ ...tomato, quantity: 2 }];
  const current = [{ ...tomato, unit_price_paise: 5000, quantity: 2 }];
  assert.deepEqual(originalRequestChanges(original, current), []);
});

test("the edited subtotal adds up quantity times unit price", () => {
  assert.equal(
    editedSubtotal([
      { ...tomato, quantity: 2 },
      { ...milk, quantity: 3 },
    ]),
    8000 + 8550,
  );
});
