import { expect, test } from "@playwright/test";

import { seedShop } from "./seed";

test("My orders lists a placed order and Reorder fills the Cart", async ({ page }) => {
  const { product, area } = seedShop();

  await page.goto("/orders");
  await expect(page.getByText("You haven't placed any orders from this phone yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start shopping" })).toBeVisible();

  await page.goto(`/search?q=${encodeURIComponent(product)}`);
  await page.getByRole("button", { name: `Add ${product} 5 kg` }).click();
  await page.getByRole("link", { name: /View cart/ }).click();
  await page.getByRole("link", { name: /Checkout · ₹270/ }).click();
  await page.getByLabel("Name").fill("Asha");
  await page.getByLabel("Phone").fill("+91 98765 43210");
  await page.getByLabel("Area").selectOption({ label: area });
  await page.getByLabel("Address").fill("12 Temple Street");
  await page.getByLabel("UPI").check();
  await page.getByRole("button", { name: "Place order · ₹270" }).click();
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  const statusPath = new URL(page.url()).pathname;

  // The Cart was cleared by checkout; the Order is listed with its total.
  await page.goto("/orders");
  const card = page.getByRole("listitem").first();
  await expect(card).toContainText("1 item");
  await expect(card).toContainText("₹270");

  await page.getByRole("link", { name: /^View order/ }).click();
  await expect(page).toHaveURL(statusPath);

  // Reorder puts its lines back in the Cart at current prices.
  await page.goto("/orders");
  await page.getByRole("button", { name: /^Reorder order/ }).click();
  await expect(page.getByRole("status")).toContainText("Added 1 item to your cart.");
  await page.goto("/cart");
  await expect(page.getByText(product)).toBeVisible();
  await expect(page.getByRole("link", { name: /Checkout · ₹270/ })).toBeVisible();
});
