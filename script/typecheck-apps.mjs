import { runPnpm } from "./run-pnpm.mjs";

await runPnpm([
  "--filter",
  "@workspace/weather-news-hub",
  "--filter",
  "@workspace/api-server",
  "--filter",
  "@workspace/scripts",
  "--if-present",
  "run",
  "typecheck",
]);
