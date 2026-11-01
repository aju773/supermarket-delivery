import { defineConfig, devices } from "@playwright/test";

// Runs against the full Docker Compose stack: start it with `docker compose up --build` first.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PROXY_PORT ?? "8090"}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
});
