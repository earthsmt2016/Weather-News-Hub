import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      shell: options.shell ?? false,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

export async function runPnpm(args) {
  const pnpmVersion =
    process.env.npm_config_user_agent?.match(/pnpm\/([^\s]+)/)?.[1] ?? "10";
  const isWindows = process.platform === "win32";
  const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
  const corepackCommand = isWindows ? "corepack.cmd" : "corepack";
  const candidates = isWindows
    ? [
        { command: corepackCommand, args: [`pnpm@${pnpmVersion}`, ...args], shell: true },
        { command: corepackCommand, args: ["pnpm", ...args], shell: true },
        { command: pnpmCommand, args, shell: true },
      ]
    : [
        { command: pnpmCommand, args },
        { command: corepackCommand, args: [`pnpm@${pnpmVersion}`, ...args] },
        { command: corepackCommand, args: ["pnpm", ...args] },
      ];

  let missingCommandError;

  for (const { command, args: commandArgs, shell } of candidates) {
    try {
      await run(command, commandArgs, { shell });
      return;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        missingCommandError = error;
        continue;
      }

      throw error;
    }
  }

  throw missingCommandError ?? new Error("Unable to find pnpm or corepack.");
}
