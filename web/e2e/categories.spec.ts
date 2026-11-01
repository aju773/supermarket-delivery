import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

test("staff add, rename, reorder, hide and unhide categories", async ({ page }) => {
  await logIn(page, createStaffMember());
  await page.goto("/admin/categories");
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const first = `Category ${randomUUID().slice(0, 6)}`;
  const second = `Category ${randomUUID().slice(0, 6)}`;
  const list = page.getByRole("region", { name: "Categories" });

  for (const name of [first, second]) {
    await page.getByRole("button", { name: "Add category" }).first().click();
    await page.getByLabel("New category name").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Category added");
    await expect(list.getByText(name, { exact: true })).toBeVisible();
  }

  await list.getByRole("button", { name: `Rename ${second}` }).click();
  await list.getByLabel(`New name for ${second}`).fill(`${second} Specials`);
  await list.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Category renamed");

  await list.getByRole("button", { name: `Move ${second} Specials up` }).click();
  await expect(page.getByRole("status")).toHaveText("Category order saved");
  const names = await list.getByRole("listitem").allInnerTexts();
  expect(names.findIndex((text) => text.includes(`${second} Specials`))).toBeLessThan(
    names.findIndex((text) => text.includes(first)),
  );

  const toggle = list.getByRole("switch", { name: `Show ${first} on the home page` });
  await toggle.click();
  await expect(page.getByRole("status")).toHaveText("Category hidden");

  await page.reload();
  await page.waitForLoadState("networkidle");
  const row = list.getByRole("listitem").filter({ hasText: first });
  await expect(row).toContainText("Hidden");
  await toggle.click();
  await expect(page.getByRole("status")).toHaveText("Category shown");
  await expect(row).not.toContainText("Hidden");
});
