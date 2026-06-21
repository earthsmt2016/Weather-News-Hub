import { runPnpm } from "./run-pnpm.mjs";

await runPnpm(["exec", "tsc", "--build"]);
await runPnpm(["run", "typecheck:apps"]);
