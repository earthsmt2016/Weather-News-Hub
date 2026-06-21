import { runPnpm } from "./run-pnpm.mjs";

await runPnpm(["--filter", "@workspace/weather-news-hub", "run", "build"]);
