import { Hono } from "hono";
import { db } from "../db";
import { areaXp, xpEvents } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const xpRoutes = new Hono();

function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

// GET /api/areas/xp/all — 모든 Area의 XP 조회
xpRoutes.get("/all", (c) => {
  const rows = db.select().from(areaXp).all();
  return c.json(rows);
});

// GET /api/areas/:id/xp — Area XP + 레벨 조회
xpRoutes.get("/:id", (c) => {
  const areaId = c.req.param("id");
  let row = db.select().from(areaXp).where(eq(areaXp.areaId, areaId)).get();

  if (!row) {
    // 없으면 자동 생성
    const id = randomUUIDv7();
    const now = new Date().toISOString();
    db.insert(areaXp).values({
      id,
      areaId,
      xp: 0,
      level: 1,
      createdAt: now,
      updatedAt: now,
    }).run();
    row = db.select().from(areaXp).where(eq(areaXp.areaId, areaId)).get();
  }

  return c.json(row);
});

// POST /api/areas/:id/xp — XP 수동 추가
xpRoutes.post("/:id", async (c) => {
  const areaId = c.req.param("id");
  const body = await c.req.json();
  const amount = body.amount ?? 0;
  const reason = body.reason ?? "manual";

  const result = await addXp(areaId, amount, reason);
  return c.json(result);
});

// XP 추가 유틸리티 함수 (다른 라우트에서도 사용)
export async function addXp(areaId: string, amount: number, reason: string) {
  const now = new Date().toISOString();

  // XP 이벤트 기록
  db.insert(xpEvents).values({
    id: randomUUIDv7(),
    areaId,
    amount,
    reason,
    createdAt: now,
  }).run();

  // areaXp 레코드 가져오기 또는 생성
  let row = db.select().from(areaXp).where(eq(areaXp.areaId, areaId)).get();
  if (!row) {
    const id = randomUUIDv7();
    db.insert(areaXp).values({
      id,
      areaId,
      xp: 0,
      level: 1,
      createdAt: now,
      updatedAt: now,
    }).run();
    row = db.select().from(areaXp).where(eq(areaXp.areaId, areaId)).get()!;
  }

  // XP & 레벨 업데이트
  const newXp = (row.xp ?? 0) + amount;
  const newLevel = calculateLevel(newXp);

  db.update(areaXp).set({
    xp: newXp,
    level: newLevel,
    updatedAt: now,
  }).where(eq(areaXp.areaId, areaId)).run();

  return db.select().from(areaXp).where(eq(areaXp.areaId, areaId)).get();
}
