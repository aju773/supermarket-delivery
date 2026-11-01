import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

async function openSettings(page: Page) {
  await logIn(page, createStaffMember());
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  // Before hydration the Save button would submit the form natively.
  await page.waitForLoadState("networkidle");
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Save", exact: true }).click();
}

test("staff change the shop settings and the home page shows them", async ({ page }) => {
  await openSettings(page);
  const before = await (await page.request.get("/api/admin/settings")).json();

  try {
    await page.getByLabel("Shop phone number").fill("080 2345 6789");
    await page.getByLabel("Minimum order amount (₹)").fill("250");
    await page.getByLabel("Opening time").fill("07:30");
    await page.getByLabel("Closing time").fill("22:00");
    await save(page);
    await expect(page.getByRole("status")).toHaveText("Settings saved");

    await page.goto("/");
    const info = page.getByRole("region", { name: "Shop info" });
    await expect(info).toContainText("Delivery 7:30 AM – 10 PM");
    await expect(info).toContainText("Min. order ₹250");
  } finally {
    // Shop Settings are shared by every test: put them back.
    const csrf = (await page.context().cookies()).find((cookie) => cookie.name === "csrftoken")?.value ?? "";
    const restored = await page.request.put("/api/admin/settings", {
      data: { ...before, phone: before.phone || "080 0000 0000" },
      headers: { "X-CSRFToken": csrf },
    });
    expect(restored.ok()).toBe(true);
  }
});

test("invalid settings show field errors and are not saved", async ({ page }) => {
  await openSettings(page);

  await page.getByLabel("Delivery charge (₹)").fill("-5");
  await page.getByLabel("Closing time").fill("06:00");
  await page.getByLabel("Shop phone number").fill("");
  await save(page);

  await expect(page.getByText("Can't be negative.")).toBeVisible();
  await expect(page.getByText("Must be after the opening time.")).toBeVisible();
  await expect(page.getByText("Enter the shop phone number.")).toBeVisible();
  await expect(page.getByLabel("Delivery charge (₹)")).toHaveAttribute("aria-invalid", "true");
});

test("staff add, rename, reorder and disable delivery areas", async ({ page }) => {
  await openSettings(page);
  const first = `Area ${randomUUID().slice(0, 6)}`;
  const second = `Area ${randomUUID().slice(0, 6)}`;
  const areas = page.getByRole("region", { name: "Delivery areas" });

  for (const name of [first, second]) {
    await areas.getByRole("button", { name: "Add area" }).click();
    await areas.getByLabel("New area name").fill(name);
    await areas.getByRole("button", { name: "Add", exact: true }).click();
    await expect(areas.getByText(name, { exact: true })).toBeVisible();
  }

  await areas.getByRole("button", { name: `Rename ${second}` }).click();
  await areas.getByLabel(`New name for ${second}`).fill(`${second} Colony`);
  await areas.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Area renamed");

  await areas.getByRole("button", { name: `Move ${second} Colony up` }).click();
  await expect(areas.getByRole("listitem").filter({ hasText: /Area / }).first()).toBeVisible();
  const names = await areas.getByRole("listitem").allInnerTexts();
  expect(names.findIndex((text) => text.includes(`${second} Colony`))).toBeLessThan(
    names.findIndex((text) => text.includes(first)),
  );

  await areas.getByRole("switch", { name: `Deliver to ${first}` }).click();
  await expect(areas.getByRole("switch", { name: `Deliver to ${first}` })).toHaveAttribute("aria-checked", "false");

  const publicAreas = await (await page.request.get("/api/shop/delivery-areas")).json();
  const publicNames = publicAreas.map((area: { name: string }) => area.name);
  expect(publicNames).toContain(`${second} Colony`);
  expect(publicNames).not.toContain(first);

  await page.reload();
  await expect(areas.getByRole("listitem").filter({ hasText: first })).toContainText("Disabled");
});
