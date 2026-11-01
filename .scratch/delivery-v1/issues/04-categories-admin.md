# 04: Categories admin

**What to build:** Staff can add, rename, reorder and hide Categories from the admin Categories page, so the home page grid can later match how the shop is organised.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Category has a name, display order and visible flag
- [ ] Categories page lists categories in display order with a "Hidden" badge on hidden ones
- [ ] Staff can add, rename, reorder and hide/unhide a category; categories are never deleted
- [ ] Saves show a toast; the empty state shows an icon, one line of text and an "Add category" button
- [ ] Admin category endpoints are paginated and reject anonymous requests
- [ ] API tests cover create, rename, reorder, hide/unhide and anonymous rejection
