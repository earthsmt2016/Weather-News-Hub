import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { rootDir, runPnpm } from "./run-pnpm.mjs";

async function build() {
  await runPnpm(["run", "typecheck"]);
  await runPnpm(["run", "build:web"]);
  await runPnpm(["run", "build:server"]);

  const frontendDist = path.join(
    rootDir,
    "artifacts",
    "weather-news-hub",
    "dist",
    "public",
  );
  const publicDist = path.join(rootDir, "dist");

  await rm(publicDist, { recursive: true, force: true });
  await cp(frontendDist, publicDist, { recursive: true });
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
