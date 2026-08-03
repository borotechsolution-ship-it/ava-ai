import { spawn } from "node:child_process";

const children = new Set();

function startProcess(name, args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: process.env
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    console.error(`${name} exited`, { code, signal });
    shutdown(code || 1);
  });

  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(code), 1500).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startProcess("Next.js", ["node_modules/next/dist/bin/next", "start"]);
startProcess("Ava agent", ["agent/ava.mjs", "start"]);
