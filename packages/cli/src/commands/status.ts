import { resolve } from "path";
import { existsSync } from "fs";

const ROOT = resolve(import.meta.dir, "../../../..");
const DB_PATH = resolve(ROOT, "packages/server/data/lifekit.db");

async function checkPort(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function statusCommand() {
  console.log("🧰 LifeKit Status\n");

  const [serverUp, webUp] = await Promise.all([
    checkPort(4000),
    checkPort(5173),
  ]);

  console.log(`  Server (localhost:4000)  ${serverUp ? "✅ Running" : "❌ Stopped"}`);
  console.log(`  Web    (localhost:5173)  ${webUp ? "✅ Running" : "❌ Stopped"}`);

  const dbExists = existsSync(DB_PATH);
  console.log(`\n  DB path: ${DB_PATH}`);
  console.log(`  DB file: ${dbExists ? "✅ Exists" : "⚠️  Not found"}`);
}
