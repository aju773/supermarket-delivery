# 14: Today tiles and New orders badge

**What to build:** The top of the Orders page shows four metric tiles (Today's orders, Today's sales, Waiting to confirm, Out for delivery), and the Orders item in the sidebar and bottom tab bar shows a count badge of New Orders from any admin page.

**Blocked by:** 12

**Design:** `admin-orders.png`, `admin-orders-phone.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] A summary endpoint returns today's order count and today's sales total (Orders created today in the shop timezone, excluding Cancelled), plus the current number of Orders in `new` and in `out_for_delivery`
- [ ] Four tiles at the top of the Orders page show these values, with sales formatted as ₹ in tabular figures
- [ ] The Orders navigation item shows the `new` count as a badge on wide screens and phones, hidden when zero
- [ ] Tiles and badge refresh along with the live list
- [ ] API tests cover the summary: Cancelled Orders excluded, the shop timezone boundary for "today", and counts matching current statuses
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
