# 09: Checkout and order status page

**What to build:** A customer can check out: enter name, phone, Delivery Area, address, landmark, note and payment method (Cash or UPI at delivery), place the Order, see a confirmation with the order number, and open a private Status Link that shows the Order's status timeline, lines and total. Details are filled in automatically next time. This covers the happy path; price/stock changes, server-side minimum order and the hourly limit come in ticket 10.

**Blocked by:** 08, 03

**Status:** ready-for-agent

- [ ] Checkout page: customer details (pre-filled from the phone), Delivery Area dropdown of active areas, address, landmark, note, Cash/UPI choice, short order summary, and a sticky "Place order · ₹total" button
- [ ] Customer fields are validated on the server: name, phone normalised to a 10-digit Indian mobile (accepts +91, spaces, leading 0), active Delivery Area, address, payment method `cash` or `upi`; errors return `422` with field errors shown next to the fields
- [ ] A successful checkout returns `201` with the order number and public token
- [ ] The Order stores Order Lines (name, pack label and unit price copied), the Original Request snapshot, delivery charge, total, a long random public token separate from a short sequential order number, and an "after hours" flag if the shop is closed
- [ ] Starting status is New for a First-Time Customer (no earlier Delivered Order for that phone) and Confirmed otherwise
- [ ] Products and Pack Options referenced by any Order can't be deleted, only hidden
- [ ] Ordering outside delivery hours tells the customer delivery starts from the next opening time
- [ ] After placing: the Cart is cleared, customer details and the order token are saved on the phone, and the confirmation page shows order number, items, total, payment method and the Status Link
- [ ] Status page (public, by token): vertical timeline (Placed, Confirmed, Out for delivery, Delivered, or Cancelled) with times, current lines and total, and a "Call the shop" button
- [ ] API tests cover the happy path, phone normalisation, inactive Delivery Area rejection, field errors, after-hours flag, First-Time Customer → New and repeat customer → Confirmed, and the public status endpoint
- [ ] Playwright (phone size): customer browses, adds to the Cart, checks out and sees the status page
