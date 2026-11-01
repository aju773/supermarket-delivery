# 16: Admin global search

**What to build:** From the admin top bar, staff can search for a Product by name or Pack Option code, or an Order by order number or customer phone, so they can answer "where's my order?" calls quickly. Results are grouped by type.

**Blocked by:** 11, 05

**Status:** ready-for-agent

- [ ] Top bar has a "Search products or orders" box on wide screens and a search entry on phones
- [ ] Products match by name (case-insensitive) or exact Pack Option code
- [ ] Orders match by exact order number or by customer phone normalised the same way as at checkout (any accepted format finds it)
- [ ] Results are grouped under Products and Orders; empty groups are not shown; tapping a result opens the product editor or order detail
- [ ] No results shows a one-line empty state
- [ ] API tests cover order search by exact number, by phone in different formats, nothing returned for unknown values, product search by name and code, and anonymous rejection
