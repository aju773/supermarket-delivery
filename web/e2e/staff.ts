import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";

/** Creates a Staff Member through the server command line, the same way the shop sets up the first one. */
export function createStaffMember() {
  const username = `staff-${randomUUID().slice(0, 8)}`;
  const password = `pw-${randomUUID()}`;
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "-e",
      `DJANGO_SUPERUSER_PASSWORD=${password}`,
      "api",
      "python",
      "manage.py",
      "createsuperuser",
      "--noinput",
      "--username",
      username,
      "--email",
      "",
    ],
    { stdio: "pipe" },
  );
  return { username, password };
}

export async function logIn(page: Page, staff: { username: string; password: string }) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Username").fill(staff.username);
  await page.getByLabel("Password", { exact: true }).fill(staff.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin\/orders$/);
}
