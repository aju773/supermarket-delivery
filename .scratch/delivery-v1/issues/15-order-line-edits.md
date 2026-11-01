# 15: Order line edits

**What to build:** While an Order is New or Confirmed, staff can change a line's quantity, remove a line, or add or swap in a different Pack Option at its current price, for example after agreeing a brand change on the phone. The total is recalculated, the Original Request is kept unchanged and shown next to the current lines, and the customer's status page shows the final lines and total.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Lines card has an Edit mode: change quantity, remove a line, add a Pack Option (searched by name or code), swap a line for another Pack Option
- [ ] New or swapped lines copy the Pack Option's name, label and current price
- [ ] Edits are rejected unless the Order is `new` or `confirmed`
- [ ] The total is recalculated after each edit; saving shows a toast
- [ ] The Original Request never changes; when it differs from the current lines it is shown beside them
- [ ] The customer status page shows the current lines and total
- [ ] API tests cover each edit type, rejection outside `new`/`confirmed`, total recalculation and the Original Request staying unchanged
