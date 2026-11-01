import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

test("staff add and edit a product, flip stock, search, filter and hide it", async ({ page }) => {
  await logIn(page, createStaffMember());
  const id = randomUUID().slice(0, 6);
  const category = `Aisle ${id}`;
  const name = `Tomato ${id}`;
  const smallCode = `${Date.now()}1`;
  const bigCode = `${Date.now()}2`;

  await page.goto("/admin/categories");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add category" }).first().click();
  await page.getByLabel("New category name").fill(category);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Category added");

  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Add product" }).first().click();
  await expect(page.getByRole("heading", { name: "Add product" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Category").selectOption({ label: category });
  await page.getByLabel("Pack label 1").fill("1 kg");
  await page.getByLabel("Code 1").fill(bigCode);
  await page.getByLabel("Price 1 (₹)").fill("38");
  await page.getByRole("button", { name: "Add pack option" }).click();
  await page.getByLabel("Pack label 2").fill("250 g");
  await page.getByLabel("Code 2").fill(bigCode);
  await page.getByLabel("Price 2 (₹)").fill("12.50");
  await page.getByRole("switch", { name: "Featured on home page" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("listitem", { name: "Pack option 2" })).toContainText("This code is used twice.");

  await page.getByLabel("Code 2").fill(smallCode);
  await page.getByRole("button", { name: "Move pack option 2 up" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Product added");
  await expect(page).toHaveURL(/\/admin\/products$/);

  const list = page.getByRole("region", { name: "Products" });
  await page.getByRole("searchbox", { name: "Search products" }).fill(name.toUpperCase());
  await page.getByRole("searchbox", { name: "Search products" }).press("Enter");
  const row = list.getByRole("listitem").filter({ hasText: name }).first();
  await expect(row).toContainText("Featured");
  await expect(row).toContainText("₹12.5");
  expect((await row.innerText()).indexOf("250 g")).toBeLessThan((await row.innerText()).indexOf("1 kg"));

  await row.getByRole("switch", { name: `${name} 1 kg in stock` }).click();
  await expect(page.getByRole("status")).toHaveText(`${name} 1 kg out of stock`);

  await page.goto(`/admin/products?q=${bigCode}`);
  await expect(list.getByRole("listitem").filter({ hasText: name }).first()).toContainText("Out of stock");

  await page.getByLabel("Category").selectOption({ label: category });
  await expect(page).toHaveURL(/category=/);
  await list.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("switch", { name: "Hidden from customers" }).click();
  await page.getByRole("button", { name: "Remove pack option 2" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Product saved");

  await page.goto(`/admin/products?q=${encodeURIComponent(name)}`);
  const hiddenRow = list.getByRole("listitem").filter({ hasText: name }).first();
  await expect(hiddenRow).toContainText("Hidden");
  await expect(hiddenRow).not.toContainText("1 kg");
});
