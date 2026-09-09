import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testDirectory =
  process.env.STORK_BROWSER_TEST_DIR ||
  mkdtempSync(join(tmpdir(), "stork-browser-"));
process.env.STORK_BROWSER_TEST_DIR = testDirectory;

export default defineConfig({
  testDir: "./tests",
  testMatch: "event-ui.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:4207",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.STORK_CHROME_PATH
      ? { executablePath: process.env.STORK_CHROME_PATH }
      : {},
    screenshot: "only-on-failure",
  },
  globalTeardown: "./tests/browser-teardown.ts",
  webServer: {
    command: "npm start -- --port 4207",
    url: "http://localhost:4207",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      STORK_ALLOW_LOCAL_STORE: "true",
      STORK_LOCAL_DB: join(testDirectory, "event.sqlite"),
      STORK_HOST_PIN: "browser-host-secret",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
