# 03: Shop Settings and Delivery Areas admin

**What to build:** Staff can edit the Shop Settings (minimum order amount, delivery charge, delivery hours, shop phone, orders-per-hour limit) and manage the list of Delivery Areas from the admin Settings page. Changes show on the customer home page info strip.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Settings page has a card for shop settings: minimum order, delivery charge (entered in ₹, stored as paise), opening time, closing time, shop phone, orders-per-hour limit
- [ ] Invalid values (negative money, closing time not after opening time, empty phone, limit below 1) are rejected with field errors
- [ ] Settings page has a Delivery Areas card: add, rename, reorder and disable areas; disabled areas are kept, not deleted
- [ ] A public endpoint returns the active Delivery Areas in display order (used by checkout in ticket 09)
- [ ] Saving shows a toast ("Settings saved")
- [ ] The customer home info strip reflects the saved hours and minimum order
- [ ] API tests cover reading and updating settings, validation errors, area create/rename/reorder/disable, the public list returning only active areas, and anonymous rejection of the admin endpoints
