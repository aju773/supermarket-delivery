# 12: Order status changes and cancelling

**What to build:** Staff move an Order through Confirmed → Out for delivery → Delivered with one tap each, and can cancel an Order that isn't delivered yet. Customers can cancel their own Order from the Status Link while it is New or Confirmed. Every change is recorded with who made it and when, and shown on the order detail and the customer timeline.

**Blocked by:** 11

**Design:** `admin-order-detail.png`, `admin-order-detail-phone.png`, `customer-order-status.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] Allowed transitions: `new → confirmed`, `confirmed → out_for_delivery`, `out_for_delivery → delivered`; staff can cancel from `new`, `confirmed` or `out_for_delivery`; the customer can cancel from `new` or `confirmed` through the token; everything else is rejected
- [ ] Every transition is saved in a status history with the time and who made it (Staff Member or "customer")
- [ ] Order detail shows the status history
- [ ] Phones: a sticky button at the bottom for the next step ("Confirm order", "Out for delivery", "Mark delivered"); Cancel lives in a ⋯ menu; wide screens show the same actions in the page
- [ ] Cancelling (staff or customer) asks for confirmation in a popup; successful changes show a toast ("Order confirmed")
- [ ] Customer status page shows a Cancel button while the Order is New or Confirmed, otherwise "Call the shop"; the timeline shows the transition times
- [ ] API tests cover every allowed and rejected transition, by staff and by the customer through the token, and that the history records who and when
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
