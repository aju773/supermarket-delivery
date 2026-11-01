"""Product photos: every upload becomes a full-size photo and a thumbnail, both WebP, so pages stay light on mobile data."""

import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps

from catalog.models import Product

# Longest side in pixels. Smaller photos are kept as they are, never enlarged.
FULL_SIZE = 1200
THUMBNAIL_SIZE = 320
QUALITY = 80
# Phone camera photos are a few MB; anything much bigger is not a product photo.
MAX_UPLOAD_MB = 15
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_PIXELS = 50_000_000

NOT_AN_IMAGE = "This file isn't a photo. Choose a JPEG, PNG or WebP image."
TOO_LARGE = f"This photo is too large. Choose one under {MAX_UPLOAD_MB} MB."


class PhotoError(ValueError):
    """An upload that can't be used as a product photo; the message is shown to staff."""


def webp(image: Image.Image, longest_side: int) -> ContentFile:
    copy = image.copy()
    copy.thumbnail((longest_side, longest_side), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "WEBP", quality=QUALITY)
    return ContentFile(buffer.getvalue())


def open_photo(file) -> Image.Image:
    if file.size > MAX_UPLOAD_BYTES:
        raise PhotoError(TOO_LARGE)
    try:
        image = Image.open(file)
        # A small file can still unpack into a huge image; refuse before loading the pixels.
        if image.width * image.height > MAX_PIXELS:
            raise PhotoError(TOO_LARGE)
        image.load()
    except (OSError, Image.DecompressionBombError, ValueError) as error:
        raise PhotoError(NOT_AN_IMAGE) from error
    # Phones store the camera's rotation separately; apply it so the photo stands the right way up.
    image = ImageOps.exif_transpose(image)
    return image.convert("RGBA" if image.has_transparency_data else "RGB")


def set_photo(product: Product, file) -> None:
    """Replaces the Product's photo with the uploaded image file, deleting the old files. Raises PhotoError."""
    image = open_photo(file)
    old = [product.photo.name, product.thumbnail.name]
    # A new name for every upload, so a replaced photo never shows from a browser's cache.
    name = uuid.uuid4().hex
    product.photo.save(f"{name}.webp", webp(image, FULL_SIZE), save=False)
    product.thumbnail.save(f"{name}-thumb.webp", webp(image, THUMBNAIL_SIZE), save=False)
    product.save(update_fields=["photo", "thumbnail"])
    delete_files(old)


def remove_photo(product: Product) -> None:
    old = [product.photo.name, product.thumbnail.name]
    product.photo = product.thumbnail = ""
    product.save(update_fields=["photo", "thumbnail"])
    delete_files(old)


def delete_files(names: list[str]) -> None:
    # Names, not the FieldFiles: saving a new photo renames the FieldFile in place.
    for name in names:
        if name:
            default_storage.delete(name)
