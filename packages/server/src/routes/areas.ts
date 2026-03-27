import { Hono } from "hono";
import { db } from "../db";
import { areas, satisfactionHistory } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const areaRoutes = new Hono();

// GET /api/areas — 전체 영역 (도메인 필터 가능)
areaRoutes.get("/", (c) => {
  const domainId = c.req.query("domain_id");
  if (domainId) {
    const result = db.select().from(areas).where(eq(areas.domainId, domainId)).orderBy(areas.sortOrder).all();
    return c.json(result);
  }
  const result = db.select().from(areas).orderBy(areas.sortOrder).all();
  return c.json(result);
});

// GET /api/areas/:id
areaRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  const area = db.select().from(areas).where(eq(areas.id, id)).get();
  if (!area) return c.json({ error: "Not found" }, 404);
  return c.json(area);
});

// GET /api/areas/:id/satisfaction-history — 만족도 이력
areaRoutes.get("/:id/satisfaction-history", (c) => {
  const { id } = c.req.param();
  const history = db
    .select()
    .from(satisfactionHistory)
    .where(eq(satisfactionHistory.areaId, id))
    .orderBy(desc(satisfactionHistory.recordedAt))
    .all();
  return c.json(history);
});

// GET /api/areas/satisfaction-history/all — 전체 영역 만족도 이력
areaRoutes.get("/satisfaction-history/all", (c) => {
  const history = db
    .select()
    .from(satisfactionHistory)
    .orderBy(desc(satisfactionHistory.recordedAt))
    .all();
  return c.json(history);
});
