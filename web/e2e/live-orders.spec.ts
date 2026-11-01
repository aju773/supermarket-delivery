import { expect, test } from "@playwright/test";

import { seedShop } from "./seed";
import { createStaffMember, logIn } from "./staff";

test("a new order appears in the live list and staff move it to Delivered", async ({ page, browser }) => {
  const { product, area } = seedShop();
  await logIn(page, createStaffMember());
  await page.getByRole("button", { name: "Start alerts" }).click();
  await expect(page.getByRole("button", { name: "Alerts on" })).toHaveAttribute("aria-pressed", "true");

  // A customer orders in another browser while the Orders page stays open.
  const customer = await browser.newPage();
  await customer.goto(`/search?q=${encodeURIComponent(product)}`);
  await customer.getByRole("button", { name: `Add ${product} 5 kg` }).click();
  await customer.getByRole("link", { name: /View cart/ }).click();
  await customer.getByRole("link", { name: /Checkout/ }).click();
  await customer.getByLabel("Name").fill("Meena Live");
  await customer.getByLabel("Phone").fill("9876501234");
  await customer.getByLabel("Area").selectOption({ label: area });
  await customer.getByLabel("Address").fill("4 Market Road");
  await customer.getByRole("button", { name: /Place order/ }).click();
  const heading = await customer.getByRole("heading", { name: /^Order #\d+$/ }).textContent();
  const number = heading!.replace("Order #", "");
  await customer.close();

  const row = page.getByRole("region", { name: "Orders" }).getByRole("row", { name: new RegExp(`#${number}\\b`) });
  await expect(row).toContainText("Meena Live", { timeout: 15_000 });
  await row.getByRole("link", { name: `#${number}` }).click();

  for (const [action, status] of [
    ["Confirm order", "Confirmed"],
    ["Out for delivery", "Out for delivery"],
    ["Mark delivered", "Delivered"],
  ]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByText(`Order ${status.toLowerCase()}`).first()).toBeVisible();
  }
  await page.goto("/admin/orders?status=delivered");
  await expect(page.getByRole("region", { name: "Orders" })).toContainText(`#${number}`);
});
