import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

test("staff add a member, reset their password, deactivate and reactivate them", async ({ page }) => {
  const me = createStaffMember();
  await logIn(page, me);
  await page.goto("/admin/staff");
  await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const list = page.getByRole("region", { name: "Staff" });
  const username = `new-${randomUUID().slice(0, 6)}`;

  await expect(list.getByRole("listitem").filter({ hasText: me.username })).toContainText("(you)");
  await expect(list.getByRole("button", { name: `Deactivate ${me.username}` })).toHaveCount(0);

  await page.getByRole("button", { name: "Add staff" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(`pw-${randomUUID()}`);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Staff member added");
  const row = list.getByRole("listitem").filter({ hasText: username });
  await expect(row).toContainText("Active");

  await row.getByRole("button", { name: `Reset password for ${username}` }).click();
  await page.getByLabel("New password", { exact: true }).fill(`pw-${randomUUID()}`);
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Password reset");

  await row.getByRole("button", { name: `Deactivate ${username}` }).click();
  await expect(page.getByRole("heading", { name: `Deactivate ${username}?` })).toBeVisible();
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Staff member deactivated");
  await expect(row).toContainText("Deactivated");

  await row.getByRole("button", { name: `Reactivate ${username}` }).click();
  await expect(page.getByRole("status")).toHaveText("Staff member reactivated");
  await expect(row).toContainText("Active");
});
