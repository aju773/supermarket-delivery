import assert from "node:assert/strict";
import { test } from "node:test";

import { alertsFor } from "./live-orders.ts";

const summary = (number: number) => ({ number }) as never;

test("no changes means no alerts", () => {
  assert.deepEqual(alertsFor({ cursor: 3, placed: [], cancelled: [], updated: [] }), []);
});

test("one alert per new order, then one per cancelled order", () => {
  assert.deepEqual(
    alertsFor({ cursor: 9, placed: [summary(4), summary(5)], cancelled: [summary(2)], updated: [2, 4, 5] }),
    ["placed", "placed", "cancelled"],
  );
});
