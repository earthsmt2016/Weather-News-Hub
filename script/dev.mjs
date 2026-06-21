import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["--use-system-ca", "./node_modules/tsx/dist/cli.mjs", "server/index.ts"],
  {
    env: {
      ...process.env,
      NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? "0",
    },
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
