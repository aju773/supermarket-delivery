# 18: CSV product import

**What to build:** Staff upload a CSV export of products and see a preview of what will be created, updated or rejected before anything is saved. Applying the import is all or nothing. Rows sharing a group become one Product with several Pack Options, and re-importing updates existing Pack Options by code instead of duplicating them.

**Blocked by:** 05

**Design:** `admin-import-csv.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** ready-for-agent

- [ ] Columns: `code`, `name`, `category`, `pack_label`, `price`, plus optional `group` and `in_stock`
- [ ] Preview parses and validates the file and reports creates, updates and row errors (with row numbers) without saving anything
- [ ] Rows with the same `group` become one Product with several Pack Options; rows without a group become a single-option Product
- [ ] Existing Pack Options are matched by `code` and updated
- [ ] Categories are created by name if they don't exist
- [ ] Apply runs in one transaction: any error saves nothing
- [ ] Apply asks for confirmation in a popup and shows a toast with the counts
- [ ] API tests cover preview saving nothing, grouping, updates by code, category creation, and all or nothing on errors
- [ ] Note: the column format may need adapting once the shop's real billing-software export is available
- [ ] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
