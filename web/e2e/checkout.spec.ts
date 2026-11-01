import { expect, test } from "@playwright/test";

import { seedShop } from "./seed";

test("customer adds to the cart, checks out and sees the status page", async ({ page }) => {
  const { product, area } = seedShop();

  await page.goto(`/search?q=${encodeURIComponent(product)}`);
  await page.getByRole("button", { name: `Add ${product} 5 kg` }).click();
  await page.getByRole("link", { name: /View cart/ }).click();
  await page.getByRole("link", { name: /Checkout · ₹270/ }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await page.getByLabel("Name").fill("Asha");
  await page.getByLabel("Phone").fill("123");
  await page.getByLabel("Area").selectOption({ label: area });
  await page.getByLabel("Address").fill("12 Temple Street");
  await page.getByLabel("UPI").check();
  await page.getByRole("button", { name: "Place order · ₹270" }).click();
  await expect(page.getByText("Enter a 10-digit mobile number.")).toBeVisible();

  await page.getByLabel("Phone").fill("+91 98765 43210");
  await page.getByRole("button", { name: "Place order · ₹270" }).click();

  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Order #\d+$/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Order progress" })).toContainText("Placed");
  await expect(page.getByRole("region", { name: "Items" })).toContainText(`${product} · 5 kg × 1`);
  await expect(page.getByText("Payment at delivery: UPI")).toBeVisible();
  const statusUrl = page.url().replace("?placed=1", "");

  // The Cart is empty and the details are filled in next time.
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
  await page.goto(statusUrl);
  await expect(page.getByRole("heading", { name: "Order placed" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Order progress" })).toContainText("Now");
});
