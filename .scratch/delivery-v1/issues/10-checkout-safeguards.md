# 10: Checkout safeguards

**What to build:** Checkout never charges a customer an amount they didn't see. If a price changed or an item went out of stock or off sale since it was added, the order is not created and the customer sees a popup listing the changes, with Confirm (update the Cart and resubmit) and Go back. The server also enforces the minimum order at current prices and limits how many orders one phone number can place per hour.

**Blocked by:** 09

**Design:** `customer-checkout-price-change.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** done

- [x] Before creating anything, the server compares every cart line's current price and stock with the price the customer saw
- [x] Any difference returns `409` with a list of `changes`, each one `price_changed` (old and new price), `out_of_stock` or `unavailable`; nothing is created
- [x] The checkout page shows the changes in a popup; Confirm updates the Cart to the new prices and removes unavailable lines, then resubmits; Go back returns to the Cart
- [x] The minimum order is checked against the subtotal at server prices and rejected with a clear message if not met
- [x] Too many orders from one phone number within an hour (per the orders-per-hour Shop Setting) returns `429`, and the customer sees a clear message
- [x] Checkout steps run in the spec's order: validate fields, rate limit, compare prices/stock, minimum order, create
- [x] API tests cover each change type returning `409` and creating nothing, minimum order rejection, and the `429` limit
- [x] Playwright: checkout shows the price-change popup, the customer confirms, and the order goes through (spec written, not run yet)
- [x] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
