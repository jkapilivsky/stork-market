import { rm } from "node:fs/promises";

export default async function teardown() {
  const directory = process.env.STORK_BROWSER_TEST_DIR;
  if (directory) await rm(directory, { recursive: true, force: true });
}
