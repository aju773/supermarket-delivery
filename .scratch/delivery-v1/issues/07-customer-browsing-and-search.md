# 07: Customer browsing and search

**What to build:** A customer can browse the shop on their phone: Category tiles and a Popular row on the home page, a Category page with a sideways-scrolling row of category buttons, product cards in a two-column grid, a product page with a large photo and all Pack Options, and a product search. Out-of-stock Pack Options are shown greyed out but can't be ordered. Add buttons are present but adding to the cart arrives in ticket 08.

**Blocked by:** 05

**Design:** `customer-home.png`, `customer-category.png`, `customer-product.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** done

- [x] A Product is shown only if it and its Category are visible and it has at least one visible Pack Option; hidden Categories don't appear as tiles
- [x] Home page: search box, the info strip from ticket 01, Category tiles in display order, and a "Popular" row of featured products
- [x] Category page: row of category buttons along the top that scrolls sideways, then the product grid
- [x] Product cards: two columns on phones, 4–6 on wide screens; photo (or grey placeholder with basket icon), name, pack label, price in ₹; a product with several Pack Options shows one pack with a ▾
- [x] Out-of-stock Pack Options are greyed out and labelled "Out of stock" with no Add button
- [x] Product page has its own link and shows a large photo and every Pack Option with its price
- [x] Search matches product names case-insensitively ("milk" finds "Milk") and shows an empty state when nothing matches
- [x] Catalog pages are rendered on the server with short caching; skeletons, not spinners, while loading
- [x] A note says the final amount is confirmed at delivery
- [x] Public catalog endpoints need no login
- [x] API tests cover the visibility rules, featured row, category listing, case-insensitive search, and out-of-stock options being returned but flagged
- [x] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
