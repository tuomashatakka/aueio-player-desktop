import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "fs";

// Use cached system chromium to avoid network download requirement
const CACHED_CHROME =
  "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";
const executablePath = existsSync(CACHED_CHROME) ? CACHED_CHROME : undefined;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
    launchOptions: {
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
