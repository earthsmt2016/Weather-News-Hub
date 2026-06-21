import { runPnpm } from "./run-pnpm.mjs";

await runPnpm(["--filter", "@workspace/api-server", "run", "start"]);
