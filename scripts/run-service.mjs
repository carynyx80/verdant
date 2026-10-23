import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const role = process.argv[2];
if (!["api", "worker"].includes(role))
  throw Error("Service must be api or worker");
const root = fileURLToPath(new URL("../", import.meta.url));
const child = spawn(
  process.execPath,
  ["--env-file-if-exists=.env", "--import", "tsx", `apps/${role}/src/main.ts`],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, TSX_TSCONFIG_PATH: root + "tsconfig.services.json" },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
