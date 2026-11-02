import assert from "node:assert/strict";
import { test } from "node:test";

import { badgeText } from "./orders-summary.ts";

test("the badge is hidden when no Orders are new", () => {
  assert.equal(badgeText(0), null);
});

test("the badge shows the count", () => {
  assert.equal(badgeText(1), "1");
  assert.equal(badgeText(99), "99");
});

test("a very large count is capped so the badge keeps its size", () => {
  assert.equal(badgeText(100), "99+");
  assert.equal(badgeText(1234), "99+");
});
