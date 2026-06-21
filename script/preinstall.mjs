import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const userAgent = process.env.npm_config_user_agent ?? "";

await Promise.all(
  ["package-lock.json", "yarn.lock"].map((file) =>
    rm(path.join(rootDir, file), { force: true }),
  ),
);

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
