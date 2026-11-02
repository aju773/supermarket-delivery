import assert from "node:assert/strict";
import { test } from "node:test";

import { MIN_QUERY_LENGTH, isSearchable, resultRows, type SearchResults } from "./admin-search.ts";

const results: SearchResults = {
  products: [{ id: 7, name: "Tomato", category: "Vegetables", thumbnail_url: null }],
  orders: [
    { number: 1047, customer_name: "Anita Rao", phone: "9845012345", total_paise: 48200, status: "new" },
    { number: 988, customer_name: "Anita Rao", phone: "9845012345", total_paise: 35600, status: "delivered" },
  ],
};

test("products come first, then orders, each opening its own page", () => {
  assert.deepEqual(
    resultRows(results).map(({ kind, href }) => [kind, href]),
    [
      ["product", "/admin/products/7"],
      ["order", "/admin/orders/1047"],
      ["order", "/admin/orders/988"],
    ],
  );
});

test("each row has a unique key", () => {
  const keys = resultRows(results).map((row) => row.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("empty groups add no rows", () => {
  assert.deepEqual(resultRows({ products: [], orders: [] }), []);
  assert.equal(resultRows({ ...results, orders: [] }).length, 1);
});

test("blank queries are not searched", () => {
  assert.equal(isSearchable(""), false);
  assert.equal(isSearchable("   "), false);
  assert.equal(isSearchable("a".repeat(MIN_QUERY_LENGTH)), true);
  assert.equal(isSearchable("  1047 "), true);
});
