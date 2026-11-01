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
