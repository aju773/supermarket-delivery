# 18: CSV product import

**What to build:** Staff upload a CSV export of products and see a preview of what will be created, updated or rejected before anything is saved. Applying the import is all or nothing. Rows sharing a group become one Product with several Pack Options, and re-importing updates existing Pack Options by code instead of duplicating them.

**Blocked by:** 05

**Design:** `admin-import-csv.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** done

- [x] Columns: `code`, `name`, `category`, `pack_label`, `price`, plus optional `group` and `in_stock`
- [x] Preview parses and validates the file and reports creates, updates and row errors (with row numbers) without saving anything
- [x] Rows with the same `group` become one Product with several Pack Options; rows without a group become a single-option Product
- [x] Existing Pack Options are matched by `code` and updated
- [x] Categories are created by name if they don't exist
- [x] Apply runs in one transaction: any error saves nothing
- [x] Apply asks for confirmation in a popup and shows a toast with the counts
- [x] API tests cover preview saving nothing, grouping, updates by code, category creation, and all or nothing on errors
- [ ] Note: the column format may need adapting once the shop's real billing-software export is available (open until the real export arrives)
- [x] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
- [ ] Playwright: preview with a bad row, then apply a fixed file and re-import (written in `web/e2e/csv-import.spec.ts`, not yet run)

**Decisions:** Apply refuses a file with any rejected row, as the ticket says, so the design's "rejected rows are skipped" is not built. Updates change an existing Pack Option's label, price and stock only, never its Product's name or Category; an option hidden earlier is shown again, like re-adding its code in the product editor. A blank `in_stock` means in stock for new options and unchanged for existing ones.
