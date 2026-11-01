# 05: Products admin

**What to build:** Staff can add and edit Products with their Pack Options, flip a Pack Option in or out of stock from the products list, search products by name or code, filter by Category, mark products featured, and hide products without deleting them.

**Blocked by:** 04

**Design:** `admin-products.png`, `admin-product-editor.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] Product has a name, Category, featured flag and visible flag; Pack Option has a product, unique code, label, price (paise), in-stock flag and display order; every Product has at least one Pack Option
- [ ] Products list shows thumbnail (grey placeholder with basket icon until ticket 06), name, Category, and each Pack Option with its price and an in-stock switch on the row
- [ ] Flipping the in-stock switch saves immediately and shows a toast
- [ ] Search matches product names case-insensitively, or a Pack Option code exactly; a Category filter narrows the list
- [ ] Hidden products show a grey "Hidden" badge; tapping a row opens the product editor
- [ ] Product editor: name, Category, featured (helper text says it shows in the home page Popular row), hidden, and a list of Pack Options (code, label, price, in stock) that can be added, edited and reordered
- [ ] Duplicate Pack Option codes are rejected with a field error
- [ ] Products and Pack Options can be hidden but there is no delete; removing a Pack Option from a product hides it
- [ ] Admin product endpoints are paginated and reject anonymous requests
- [ ] API tests cover create/update with several Pack Options, duplicate code rejection, stock toggle, featured and hidden flags, name search (case-insensitive), exact code search and category filter
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
