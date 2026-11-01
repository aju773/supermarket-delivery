import assert from "node:assert/strict";
import { test } from "node:test";

import { addOrderToken, parseCustomerDetails, parseOrderTokens } from "./customer.ts";

const asha = {
  name: "Asha",
  phone: "9876543210",
  deliveryAreaId: 3,
  address: "12 Temple Street",
  landmark: "",
  paymentMethod: "upi",
};

test("stored customer details are read back", () => {
  assert.deepEqual(parseCustomerDetails(JSON.stringify(asha)), asha);
});

test("missing or malformed customer details are none", () => {
  assert.equal(parseCustomerDetails(null), null);
  assert.equal(parseCustomerDetails("not json"), null);
  assert.equal(parseCustomerDetails(JSON.stringify({ ...asha, phone: 9876543210 })), null);
  assert.equal(parseCustomerDetails(JSON.stringify({ ...asha, paymentMethod: "card" })), null);
});

test("an unknown delivery area is kept as no area", () => {
  assert.deepEqual(parseCustomerDetails(JSON.stringify({ ...asha, deliveryAreaId: null })), {
    ...asha,
    deliveryAreaId: null,
  });
});

test("order tokens are kept newest first without repeats", () => {
  assert.deepEqual(addOrderToken(["b", "a"], "c"), ["c", "b", "a"]);
  assert.deepEqual(addOrderToken(["b", "a"], "a"), ["a", "b"]);
});

test("malformed stored order tokens are dropped", () => {
  assert.deepEqual(parseOrderTokens(null), []);
  assert.deepEqual(parseOrderTokens("{}"), []);
  assert.deepEqual(parseOrderTokens(JSON.stringify(["a", 3, "", "b"])), ["a", "b"]);
});
