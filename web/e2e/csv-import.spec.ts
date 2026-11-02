import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

const HEADER = "code,name,category,pack_label,price,group,in_stock\n";

function csv(text: string) {
  return { name: "export.csv", mimeType: "text/csv", buffer: Buffer.from(text) };
}

test("staff preview a CSV with a bad row, then apply a fixed one", async ({ page }) => {
  await logIn(page, createStaffMember());
  await page.goto("/admin/import");
  await expect(page.getByRole("heading", { name: "Import products" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const id = randomUUID().slice(0, 6);
  const category = `Import ${id}`;
  const product = `Tomato ${id}`;
  const good = `${HEADER}${id}-1,${product},${category},500 g,24,t,\n${id}-2,${product},${category},1 kg,45,t,\n`;

  // A bad row is reported with its row number and Apply stays off.
  await page.getByLabel("CSV file").setInputFiles(csv(`${good}${id}-3,Onion ${id},${category},1 kg,oops,,\n`));
  const rejected = page.getByRole("region", { name: "Rejected rows" });
  await expect(rejected).toContainText("Price must be an amount like 24 or 24.50.");
  await expect(rejected.getByRole("cell", { name: "4", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply import" })).toBeDisabled();

  // The fixed file previews as creates, and applying saves it after confirming.
  await page.getByLabel("CSV file").setInputFiles(csv(good));
  const changes = page.getByRole("region", { name: "Preview of changes" });
  await expect(changes.getByRole("row")).toHaveCount(3);
  await expect(changes).toContainText("Create");
  await page.getByRole("button", { name: "Apply import" }).click();
  const dialog = page.getByRole("dialog", { name: "Apply this import?" });
  await expect(dialog).toContainText("1 product and 2 pack options will be created. 1 category will be created.");
  await dialog.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByRole("status")).toContainText("Import applied: 1 product and 2 pack options created");

  // Importing the same file again updates the options instead of duplicating them.
  await page.getByLabel("CSV file").setInputFiles(csv(good.replace(",24,", ",26,")));
  await expect(changes).toContainText("Update");
  await expect(changes).toContainText("₹24");
  await expect(changes).toContainText("₹26");
  await page.getByRole("button", { name: "Apply import" }).click();
  await page.getByRole("dialog", { name: "Apply this import?" }).getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByRole("status")).toContainText("Import applied: 2 pack options updated");

  await page.goto(`/admin/products?q=${encodeURIComponent(product)}`);
  await expect(page.getByText("500 g")).toHaveCount(1);
});
