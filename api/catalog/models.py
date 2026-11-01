from django.db import models
from django.db.models.functions import Lower


class Category(models.Model):
    """A group of Products shown as a tile on the home page. Hidden, never deleted, so Products keep their Category."""

    name = models.CharField(max_length=100)
    position = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(Lower("name"), name="category_unique_name"),
        ]

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    """Something the shop sells, shown as one card to customers. Hidden, never deleted, so old Orders still make sense."""

    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    is_featured = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return self.name


class PackOption(models.Model):
    """A purchasable size of a Product. Removing one from a Product hides it, so its code stays taken."""

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="pack_options")
    code = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=50)
    price_paise = models.PositiveIntegerField()
    in_stock = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return f"{self.product.name} {self.label}"
