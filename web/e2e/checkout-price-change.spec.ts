import { expect, test } from "@playwright/test";

import { seedShop, setPrice } from "./seed";

test("checkout shows a price change, the customer confirms and the order goes through", async ({ page }) => {
  const { product, area, code } = seedShop();

  await page.goto(`/search?q=${encodeURIComponent(product)}`);
  await page.getByRole("button", { name: `Add ${product} 5 kg` }).click();
  await page.goto("/checkout");
  setPrice(code, 26000);

  await page.getByLabel("Name").fill("Asha");
  // A phone of its own, so other specs' orders don't count towards the hourly limit.
  await page.getByLabel("Phone").fill(`9${String(Date.now()).slice(-9)}`);
  await page.getByLabel("Area").selectOption({ label: area });
  await page.getByLabel("Address").fill("12 Temple Street");
  await page.getByRole("button", { name: "Place order · ₹270" }).click();

  const popup = page.getByRole("dialog", { name: "Some items changed" });
  await expect(popup).toContainText(`${product} · 5 kg`);
  await expect(popup).toContainText("Price changed: ₹250 → ₹260");
  await expect(popup).toContainText("New total₹280");
  await popup.getByRole("button", { name: "Confirm and place order" }).click();

  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Items" })).toContainText(`${product} · 5 kg × 1`);
});
