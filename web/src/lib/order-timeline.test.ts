import assert from "node:assert/strict";
import { test } from "node:test";

import { customerCanCancel, nextStep, staffCanCancel, timeline } from "./order-timeline.ts";

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

test("staff move an order one step on with the matching button and toast", () => {
  assert.deepEqual(nextStep("new"), { status: "confirmed", action: "Confirm order", done: "Order confirmed" });
  assert.deepEqual(nextStep("confirmed"), {
    status: "out_for_delivery",
    action: "Out for delivery",
    done: "Order out for delivery",
  });
  assert.deepEqual(nextStep("out_for_delivery"), { status: "delivered", action: "Mark delivered", done: "Order delivered" });
  assert.equal(nextStep("delivered"), null);
  assert.equal(nextStep("cancelled"), null);
});

test("staff can cancel until delivered; the customer only while new or confirmed", () => {
  const statuses = ["new", "confirmed", "out_for_delivery", "delivered", "cancelled"] as const;
  assert.deepEqual(statuses.filter(staffCanCancel), ["new", "confirmed", "out_for_delivery"]);
  assert.deepEqual(statuses.filter(customerCanCancel), ["new", "confirmed"]);
});
