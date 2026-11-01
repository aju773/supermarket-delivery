import { expect, test } from "@playwright/test";

test("home page shows the shop info strip from Shop Settings", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner").getByRole("link", { name: "My orders" })).toBeVisible();

  const info = page.getByRole("region", { name: "Shop info" });
  await expect(info).toContainText(/Open now|Closed now/);
  await expect(info).toContainText("Delivery 8 AM – 9 PM");
  await expect(info).toContainText("Min. order ₹200");
});
