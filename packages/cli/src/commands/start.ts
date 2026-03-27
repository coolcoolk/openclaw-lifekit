import { resolve } from "path";
import { Subprocess } from "bun";

const ROOT = resolve(import.meta.dir, "../../../..");

export async function startCommand() {
  console.log("🧰 LifeKit starting...\n");

  const serverDir = resolve(ROOT, "packages/server");
  const webDir = resolve(ROOT, "packages/web");

  console.log("  📦 Server  → http://localhost:4000");
  console.log("  🌐 Web     → http://localhost:5173\n");

  const server = Bun.spawn(["bun", "run", "dev"], {
    cwd: serverDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const web = Bun.spawn(["bun", "run", "dev"], {
    cwd: webDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const cleanup = () => {
    console.log("\n🛑 Shutting down LifeKit...");
    server.kill();
    web.kill();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Wait for both processes
  await Promise.all([server.exited, web.exited]);
}
