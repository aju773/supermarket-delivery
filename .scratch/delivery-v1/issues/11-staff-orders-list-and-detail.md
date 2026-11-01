# 11: Staff orders list and order detail

**What to build:** Staff see every Order on the Orders landing page, filter by status, and open an order detail page with everything needed to pack and deliver: customer name, tap-to-call phone, area, address, landmark, note, payment method, lines and total. Orders from First-Time Customers are tagged "Call to confirm".

**Blocked by:** 09

**Design:** `admin-orders.png`, `admin-orders-phone.png`, `admin-order-detail.png`, `admin-order-detail-phone.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] Admin endpoint lists Orders, newest first, paginated, filterable by status
- [ ] Status filter buttons above the list
- [ ] Phones: one card per Order with order number, name, area, total, time, status badge and "Call to confirm" tag; wide screens: a table with the same columns
- [ ] Status badges always include the status name: New amber, Confirmed blue, Out for delivery purple, Delivered green, Cancelled grey; a separate grey "After hours" tag with a moon icon
- [ ] Order detail, wide screens: two columns; left has the lines card with totals, right has the customer card (tap-to-call phone, area, address, landmark, note, payment method)
- [ ] Order detail, phones: the same cards stacked
- [ ] Empty list state shows an icon, one line of text and an action
- [ ] API tests cover listing, status filtering, pagination, the detail endpoint and anonymous rejection
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
