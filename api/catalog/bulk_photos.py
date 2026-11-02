"""Bulk photo upload: loose image files or zips, each matched to a Pack Option by file name = code."""

import posixpath
import zipfile
import zlib
from dataclasses import dataclass, field

from django.core.files.base import ContentFile

from catalog import photos
from catalog.models import PackOption

NO_MATCH = "No pack option has this code."
BROKEN_ZIP = "This zip file can't be opened."
REPLACED = "Replaced by {}, another photo for the same product."
BROKEN_ENTRY = "This file can't be unpacked from the zip."


@dataclass
class Matched:
    filename: str
    code: str
    product: str
    pack_label: str
    thumbnail_url: str


@dataclass
class Unmatched:
    filename: str
    reason: str


@dataclass
class Report:
    matched: list[Matched] = field(default_factory=list)
    unmatched: list[Unmatched] = field(default_factory=list)


def code_of(filename: str) -> str:
    """The file name without its extension: "8901725133719.jpg" is code 8901725133719."""
    return posixpath.splitext(filename)[0].strip()


def is_junk(path: str) -> bool:
    """Folders and the hidden files Mac and Windows leave inside zips."""
    name = posixpath.basename(path)
    return not name or name.startswith(".") or path.startswith("__MACOSX/")


def base_name(path: str) -> str:
    """The file's own name, without the folders it sat in (Windows zips may use backslashes)."""
    return posixpath.basename(path.replace("\\", "/"))


def unpack(archive) -> list[tuple[str, ContentFile | str]]:
    """Each file in the zip as (name, content), or (name, reason) for a file too big to unpack. Raises BadZipFile."""
    entries = []
    with zipfile.ZipFile(archive) as zip_file:
        for info in zip_file.infolist():
            if is_junk(info.filename):
                continue
            name = base_name(info.filename)
            if info.file_size > photos.MAX_UPLOAD_BYTES:
                entries.append((name, photos.TOO_LARGE))
                continue
            try:
                with zip_file.open(info) as entry:
                    # The header's size can lie, so read one byte past the limit to be sure.
                    data = entry.read(photos.MAX_UPLOAD_BYTES + 1)
            except (zipfile.BadZipFile, RuntimeError, NotImplementedError, EOFError, zlib.error):
                # Damaged, encrypted or compressed in a way we can't read: this entry fails, the others still go through.
                entries.append((name, BROKEN_ENTRY))
                continue
            entries.append((name, ContentFile(data) if len(data) <= photos.MAX_UPLOAD_BYTES else photos.TOO_LARGE))
    return entries


def files_in(uploads) -> list[tuple[str, object]]:
    """Every file to process, in upload order, with zips expanded. A zip that can't be read is a (name, reason) entry."""
    files = []
    for upload in uploads:
        if not upload.name.lower().endswith(".zip"):
            files.append((upload.name, upload))
            continue
        try:
            files.extend(unpack(upload))
        except zipfile.BadZipFile:
            files.append((upload.name, BROKEN_ZIP))
    return files


def import_photos(uploads) -> Report:
    """Sets each matching Product's photo. Files that can't be used are reported; the others are still saved."""
    files = files_in(uploads)
    options = {
        option.code: option
        for option in PackOption.objects.filter(code__in={code_of(name) for name, _ in files}).select_related("product")
    }
    # One instance per Product, so two files for the same Product replace each other's files cleanly.
    products = {}
    for option in options.values():
        option.product = products.setdefault(option.product_id, option.product)
    report = Report()
    saved = {}  # Product id -> the Matched entry whose photo the Product now has
    for name, content in files:
        if isinstance(content, str):
            report.unmatched.append(Unmatched(name, content))
            continue
        option = options.get(code_of(name))
        if option is None:
            report.unmatched.append(Unmatched(name, NO_MATCH))
            continue
        try:
            photos.set_photo(option.product, content)
        except photos.PhotoError as error:
            report.unmatched.append(Unmatched(name, str(error)))
            continue
        product = option.product
        if replaced := saved.get(product.pk):
            # The earlier photo's files are gone, so showing it would be a broken image.
            report.matched.remove(replaced)
            report.unmatched.append(Unmatched(replaced.filename, REPLACED.format(name)))
        saved[product.pk] = Matched(name, option.code, product.name, option.label, product.thumbnail.url)
        report.matched.append(saved[product.pk])
    return report
