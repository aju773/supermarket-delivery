# 08: Cart

**What to build:** A customer can add Pack Options to their Cart with one tap, change quantities from the card or the cart page, pick a pack size from a panel that slides up, and always see a cart bar with item count and total. The Cart is kept on the phone across visits. The cart page shows the delivery charge, how far the Cart is below the minimum order, and blocks checkout below it.

**Blocked by:** 07

**Design:** `customer-category.png`, `customer-pack-size-sheet.png`, `customer-cart.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] Add button on a card turns into a − 1 + counter; going below 1 removes the item
- [ ] Products with one Pack Option add straight from the card
- [ ] Products with several Pack Options: tapping the pack with ▾ opens a bottom panel listing every pack with its price and its own Add/counter
- [ ] Cart is stored on the phone (localStorage) as pack option ID, quantity and the price seen; it survives closing the browser; all reads and writes handle localStorage being unavailable without breaking the page
- [ ] Cart bar fixed to the bottom on phones ("3 items · ₹245 · View cart") whenever the Cart isn't empty; wide screens show a cart button with a count in the top bar instead
- [ ] Cart page: lines with quantity controls and remove, subtotal, delivery charge, total, the "final amount confirmed at delivery" note, and a minimum-order message saying how much more is needed
- [ ] The checkout button is disabled below the minimum order amount with a clear message
- [ ] Empty Cart shows an icon, one line of text and a "Browse products" button
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
