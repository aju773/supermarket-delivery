import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

/** Runs Python in the API container's Django shell, the quickest way to set up data a test needs. */
function djangoShell(code: string) {
  execFileSync("docker", ["compose", "exec", "-T", "api", "python", "manage.py", "shell", "-c", code], { stdio: "pipe" });
}

/** A visible Product with one in-stock ₹250 Pack Option (above the default minimum order), and an active Delivery Area. */
export function seedShop() {
  const id = randomUUID().slice(0, 6);
  const product = `Basmati ${id}`;
  const area = `Colony ${id}`;
  djangoShell(`
from catalog.models import Category, PackOption, Product
from shop.models import DeliveryArea
category = Category.objects.create(name="Rice ${id}")
product = Product.objects.create(category=category, name="${product}")
PackOption.objects.create(product=product, code="basmati-${id}", label="5 kg", price_paise=25000)
DeliveryArea.objects.create(name="${area}")
`);
  return { product, area };
}
