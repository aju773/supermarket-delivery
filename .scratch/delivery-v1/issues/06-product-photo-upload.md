# 06: Product photo upload

**What to build:** From the product editor, staff can upload or replace a Product's photo using the phone camera or gallery. The photo is resized and compressed automatically, and the thumbnail appears in the products list.

**Blocked by:** 05

**Design:** `admin-product-editor.png` in `docs/design/screens/`. Follow `docs/design/README.md`: the spec wins on content, screenshots guide layout.

**Status:** done

- [x] Product editor has a photo area that opens the camera or gallery on phones and a file picker on wide screens
- [x] Uploaded photos are processed into a full size and a thumbnail, both stored as WebP
- [x] Replacing a photo swaps it; products without a photo keep the grey placeholder with a basket icon
- [x] Non-image files and oversized uploads are rejected with a clear message
- [x] Photo files are served to the customer site and admin through stable URLs
- [x] API tests cover upload, replacement, rejection of non-images, and that the stored images are resized WebP
- [x] No hard-coded values: every colour, size, radius, shadow, spacing and layer comes from the design tokens (the CI check passes)
