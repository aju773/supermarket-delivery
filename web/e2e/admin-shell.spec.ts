import { expect, test } from "@playwright/test";

import { createStaffMember, logIn } from "./staff";

test("logged-out visitors to admin pages are sent to the login page", async ({ page }) => {
  await page.goto("/admin/settings");

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  const staff = createStaffMember();
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill(staff.username);
  await page.getByLabel("Password", { exact: true }).fill("not the password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.locator("form").getByRole("alert")).toHaveText("Wrong username or password.");
});

test("on a phone, staff log in to Orders, use the tab bar and ☰ menu, and log out", async ({ page }) => {
  await logIn(page, createStaffMember());

  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByText("No orders yet.")).toBeVisible();

  const tabs = page.getByRole("navigation", { name: "Main pages" });
  await expect(tabs.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Products" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

  await tabs.getByRole("button", { name: "More" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.getByRole("link", { name: "Staff" }).click();
  await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();
  await expect(menu).toBeHidden();

  await page.getByRole("button", { name: "Open menu" }).click();
  await menu.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("staff change their own password from the account menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const staff = createStaffMember();
  await logIn(page, staff);

  await page.getByRole("button", { name: `Account: ${staff.username}` }).click();
  const items = page.getByRole("menuitem");
  await expect(items).toHaveText(["Change password", "Log out"]);
  await items.getByText("Change password").click();
  await expect(page.getByRole("heading", { name: "Change password" })).toBeVisible();

  await page.getByLabel("Current password").fill("wrong current password");
  await page.getByLabel("New password", { exact: true }).fill("a brand new secret");
  await page.getByLabel("Confirm new password").fill("a brand new secret");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Current password is wrong.");

  await page.getByLabel("Current password").fill(staff.password);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toHaveText("Password changed");
});
