# 19: Bulk photo upload

**What to build:** Staff upload many photos at once (or a zip), each matched to a Product by file name = Pack Option code, so they don't attach hundreds of photos one by one. Files that don't match any code are reported so they can be renamed and retried.

**Blocked by:** 06

**Design:** `admin-import-photos.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** done

- [x] Import area has a Photos page accepting many image files or a zip
- [x] Each file name without its extension is matched to a Pack Option code, and the photo is set on that option's Product using the same processing as ticket 06
- [x] The result lists matched files and unmatched files
- [x] Non-image files are reported, not saved
- [x] API tests cover matching by code, zip uploads, unmatched files reported, and images resized and converted to WebP
- [x] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
- [ ] Playwright: upload a matching image, a non-matching image and a text file (written in `web/e2e/bulk-photos.spec.ts`, not yet run)

**Decisions:** Photos is a second tab on the Import page (`/admin/import/photos`), as in the design. The browser sends files 20 at a time so the progress bar moves and no request grows large; a direct API call is limited by Django's default of 100 files per request. Matching is exact on the file name without its extension. A file that matches a code but isn't a usable image (or is over the size limit) is reported with the reason and saves nothing; a non-image that matches no code is reported as not matching. Zip contents are matched by file name only (folders ignored; hidden and `__MACOSX` entries skipped), and a zip that can't be opened is listed as one failed file. A matched file replaces the Product's existing photo; when two files in one upload are for the same Product the later one wins and the earlier is listed with that reason (across the browser's batches the earlier thumbnail on screen may point at a replaced file). One damaged entry in a zip fails alone. The unmatched list is titled "Not saved" because it also holds files that matched a code but weren't usable images. A zip is unpacked in memory, so a very large one is better split. Added a `border-emphasis` token for the tab underline and drop area.
