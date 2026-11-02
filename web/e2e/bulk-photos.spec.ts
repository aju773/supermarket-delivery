import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

// A 1x1 PNG.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("staff upload photos named by code and see which files didn't match", async ({ page }) => {
  await logIn(page, createStaffMember());
  const id = randomUUID().slice(0, 6);
  const code = `photo-${id}`;

  // Create a product with a known code through the CSV import.
  await page.goto("/admin/import");
  await page.waitForLoadState("networkidle");
  const csv = `code,name,category,pack_label,price\n${code},Photo ${id},Photos ${id},1 kg,10\n`;
  await page.getByLabel("CSV file").setInputFiles({ name: "p.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Apply import" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByRole("status")).toContainText("Import applied");

  await page.getByRole("link", { name: "Photos" }).click();
  await expect(page).toHaveURL(/\/admin\/import\/photos$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Photo files").setInputFiles([
    { name: `${code}.png`, mimeType: "image/png", buffer: PIXEL },
    { name: `unknown-${id}.png`, mimeType: "image/png", buffer: PIXEL },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
  ]);

  await expect(page.getByText("Uploaded 3 of 3 files")).toBeVisible();
  const matched = page.getByRole("region", { name: "Matched photos" });
  await expect(matched).toContainText(`Photo ${id} 1 kg`);
  const missed = page.getByRole("region", { name: "Files that weren't saved" });
  await expect(missed).toContainText(`unknown-${id}.png`);
  await expect(missed).toContainText("notes.txt");
});
