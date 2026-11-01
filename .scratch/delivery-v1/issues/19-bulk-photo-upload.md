# 19: Bulk photo upload

**What to build:** Staff upload many photos at once (or a zip), each matched to a Product by file name = Pack Option code, so they don't attach hundreds of photos one by one. Files that don't match any code are reported so they can be renamed and retried.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Import area has a Photos page accepting many image files or a zip
- [ ] Each file name without its extension is matched to a Pack Option code, and the photo is set on that option's Product using the same processing as ticket 06
- [ ] The result lists matched files and unmatched files
- [ ] Non-image files are reported, not saved
- [ ] API tests cover matching by code, zip uploads, unmatched files reported, and images resized and converted to WebP
