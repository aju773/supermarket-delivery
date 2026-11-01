# 04: Categories admin

**What to build:** Staff can add, rename, reorder and hide Categories from the admin Categories page, so the home page grid can later match how the shop is organised.

**Blocked by:** 02

**Design:** `admin-categories.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** done

- [x] Category has a name, display order and visible flag
- [x] Categories page lists categories in display order with a "Hidden" badge on hidden ones
- [x] Staff can add, rename, reorder and hide/unhide a category; categories are never deleted
- [x] Saves show a toast; the empty state shows an icon, one line of text and an "Add category" button
- [x] Admin category endpoints are paginated and reject anonymous requests
- [x] API tests cover create, rename, reorder, hide/unhide and anonymous rejection
- [x] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
