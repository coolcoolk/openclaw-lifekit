import { Hono } from "hono";
import { db, sqlite } from "../db";
import { areaKits } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const kitRoutes = new Hono();

// Kit 메타데이터를 kits/ 폴더에서 로드
function loadKitMeta() {
  const kitsDir = join(import.meta.dir, "../../../../kits");
  if (!existsSync(kitsDir)) return [];

  const entries = readdirSync(kitsDir, { withFileTypes: true });
  const kits: any[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const kitJsonPath = join(kitsDir, entry.name, "kit.json");
    if (!existsSync(kitJsonPath)) continue;
    const meta = JSON.parse(readFileSync(kitJsonPath, "utf-8"));
    kits.push(meta);
  }
  return kits;
}

// GET /api/kits — 전체 Kit 목록 + 설치 상태
kitRoutes.get("/", (c) => {
  const allKits = loadKitMeta();
  const installed = db.select().from(areaKits).all();
  const installedMap = new Map(installed.map((i) => [i.kitId, i]));

  const result = allKits.map((kit) => ({
    ...kit,
    installed: installedMap.has(kit.id),
    installedAt: installedMap.get(kit.id)?.installedAt || null,
    config: installedMap.get(kit.id)?.config ? JSON.parse(installedMap.get(kit.id)!.config!) : null,
  }));

  return c.json(result);
});

// GET /api/kits/:kitId — Kit 정보
kitRoutes.get("/:kitId", (c) => {
  const { kitId } = c.req.param();
  const allKits = loadKitMeta();
  const kit = allKits.find((k) => k.id === kitId);
  if (!kit) return c.json({ error: "Kit not found" }, 404);

  const installed = db.select().from(areaKits).where(eq(areaKits.kitId, kitId)).get();
  return c.json({
    ...kit,
    installed: !!installed,
    installedAt: installed?.installedAt || null,
    config: installed?.config ? JSON.parse(installed.config) : null,
  });
});

// POST /api/kits/:kitId/install — Kit 설치
kitRoutes.post("/:kitId/install", async (c) => {
  const { kitId } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  const allKits = loadKitMeta();
  const kit = allKits.find((k) => k.id === kitId);
  if (!kit) return c.json({ error: "Kit not found" }, 404);

  // 이미 설치 확인
  const existing = db.select().from(areaKits).where(eq(areaKits.kitId, kitId)).get();
  if (existing) return c.json({ error: "Kit already installed" }, 409);

  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(areaKits).values({
    id,
    areaId: kit.areaId,
    kitId: kit.id,
    installedAt: now,
    config: body.config ? JSON.stringify(body.config) : null,
  }).run();

  return c.json({ ok: true, kitId: kit.id, installedAt: now }, 201);
});

// DELETE /api/kits/:kitId/uninstall — Kit 제거
kitRoutes.delete("/:kitId/uninstall", (c) => {
  const { kitId } = c.req.param();
  db.delete(areaKits).where(eq(areaKits.kitId, kitId)).run();
  return c.json({ ok: true });
});
