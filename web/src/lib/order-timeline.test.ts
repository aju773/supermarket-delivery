import assert from "node:assert/strict";
import { test } from "node:test";

import { timeline } from "./order-timeline.ts";

const placed = "2026-11-02T06:30:00Z";

test("a new order has only Placed done and current", () => {
  assert.deepEqual(timeline("new", placed, [{ status: "new", at: placed }]), [
    { label: "Placed", at: placed, done: true, current: true },
    { label: "Confirmed", at: null, done: false, current: false },
    { label: "Out for delivery", at: null, done: false, current: false },
    { label: "Delivered", at: null, done: false, current: false },
  ]);
});

test("a confirmed order shows when it was confirmed", () => {
  const steps = timeline("confirmed", placed, [
    { status: "new", at: placed },
    { status: "confirmed", at: "2026-11-02T06:40:00Z" },
  ]);
  assert.deepEqual(
    steps.map(({ label, at, done, current }) => [label, at, done, current]),
    [
      ["Placed", placed, true, false],
      ["Confirmed", "2026-11-02T06:40:00Z", true, true],
      ["Out for delivery", null, false, false],
      ["Delivered", null, false, false],
    ],
  );
});

test("a cancelled order ends at Cancelled after the steps it reached", () => {
  const steps = timeline("cancelled", placed, [
    { status: "confirmed", at: placed },
    { status: "cancelled", at: "2026-11-02T07:00:00Z" },
  ]);
  assert.deepEqual(
    steps.map(({ label, current }) => [label, current]),
    [
      ["Placed", false],
      ["Confirmed", false],
      ["Cancelled", true],
    ],
  );
});
