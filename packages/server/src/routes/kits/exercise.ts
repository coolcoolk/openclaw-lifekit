import { Hono } from "hono";
import { db, sqlite } from "../../db";
import { activityLogs, activityTypes } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const exerciseRoutes = new Hono();

// ── Activity Logs ──

// GET /api/kits/exercise/logs
exerciseRoutes.get("/logs", (c) => {
  const date = c.req.query("date");
  if (date) {
    const rows = db.select().from(activityLogs).where(eq(activityLogs.date, date)).all();
    return c.json(rows);
  }
  const rows = db.select().from(activityLogs).all();
  return c.json(rows);
});

// GET /api/kits/exercise/logs/:id
exerciseRoutes.get("/logs/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(activityLogs).where(eq(activityLogs.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/exercise/logs
exerciseRoutes.post("/logs", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(activityLogs).values({
    id,
    areaId: body.area_id || "health-exercise",
    activityType: body.activity_type,
    date: body.date,
    durationMin: body.duration_min || null,
    calories: body.calories || null,
    avgHeartRate: body.avg_heart_rate || null,
    intensity: body.intensity || null,
    memo: body.memo || null,
    extraData: body.extra_data ? JSON.stringify(body.extra_data) : null,
    createdAt: now,
  }).run();

  const created = db.select().from(activityLogs).where(eq(activityLogs.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/exercise/logs/:id
exerciseRoutes.patch("/logs/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.activity_type !== undefined) updates.activityType = body.activity_type;
  if (body.date !== undefined) updates.date = body.date;
  if (body.duration_min !== undefined) updates.durationMin = body.duration_min;
  if (body.calories !== undefined) updates.calories = body.calories;
  if (body.avg_heart_rate !== undefined) updates.avgHeartRate = body.avg_heart_rate;
  if (body.intensity !== undefined) updates.intensity = body.intensity;
  if (body.memo !== undefined) updates.memo = body.memo;
  if (body.extra_data !== undefined) updates.extraData = JSON.stringify(body.extra_data);

  db.update(activityLogs).set(updates).where(eq(activityLogs.id, id)).run();
  const updated = db.select().from(activityLogs).where(eq(activityLogs.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/exercise/logs/:id
exerciseRoutes.delete("/logs/:id", (c) => {
  const { id } = c.req.param();
  db.delete(activityLogs).where(eq(activityLogs.id, id)).run();
  return c.json({ ok: true });
});

// GET /api/kits/exercise/stats/weekly — 주간 통계
exerciseRoutes.get("/stats/weekly", (c) => {
  const rows = sqlite.query<any, []>(`
    SELECT
      activity_type,
      COUNT(*) as count,
      SUM(duration_min) as total_duration_min,
      SUM(calories) as total_calories,
      AVG(intensity) as avg_intensity
    FROM activity_logs
    WHERE date >= date('now', '-7 days')
    GROUP BY activity_type
    ORDER BY count DESC
  `).all();
  return c.json(rows);
});

// ── Activity Types ──

// GET /api/kits/exercise/types
exerciseRoutes.get("/types", (c) => {
  const rows = db.select().from(activityTypes).all();
  return c.json(rows);
});

// POST /api/kits/exercise/types
exerciseRoutes.post("/types", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(activityTypes).values({
    id,
    name: body.name,
    icon: body.icon || null,
    isDefault: false,
    createdAt: now,
  }).run();

  const created = db.select().from(activityTypes).where(eq(activityTypes.id, id)).get();
  return c.json(created, 201);
});

// DELETE /api/kits/exercise/types/:id
exerciseRoutes.delete("/types/:id", (c) => {
  const { id } = c.req.param();
  db.delete(activityTypes).where(eq(activityTypes.id, id)).run();
  return c.json({ ok: true });
});
