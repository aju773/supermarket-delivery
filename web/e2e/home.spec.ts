import { expect, test } from "@playwright/test";

test("home page shows the shop info strip from Shop Settings", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner").getByRole("link", { name: "My orders" })).toBeVisible();

  const info = page.getByRole("region", { name: "Shop info" });
  await expect(info).toContainText(/Open now|Closed now/);
  // Exact values are checked in settings.spec.ts, which changes them while other tests run.
  await expect(info).toContainText(/Delivery \d.* (AM|PM) – \d.* (AM|PM)/);
  await expect(info).toContainText(/Min\. order ₹\d/);
});
