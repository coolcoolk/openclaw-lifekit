import { Hono } from "hono";
import { db, sqlite } from "../../db";
import { mealLogs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const dietRoutes = new Hono();

// GET /api/kits/diet/logs
dietRoutes.get("/logs", (c) => {
  const date = c.req.query("date");
  if (date) {
    const rows = db.select().from(mealLogs).where(eq(mealLogs.date, date)).all();
    return c.json(rows);
  }
  const rows = db.select().from(mealLogs).all();
  return c.json(rows);
});

// GET /api/kits/diet/logs/:id
dietRoutes.get("/logs/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(mealLogs).where(eq(mealLogs.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/diet/logs
dietRoutes.post("/logs", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(mealLogs).values({
    id,
    date: body.date,
    mealType: body.meal_type,
    foodName: body.food_name,
    calories: body.calories || null,
    protein: body.protein || null,
    carbs: body.carbs || null,
    fat: body.fat || null,
    source: body.source || "manual",
    memo: body.memo || null,
    createdAt: now,
  }).run();

  const created = db.select().from(mealLogs).where(eq(mealLogs.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/diet/logs/:id
dietRoutes.patch("/logs/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.meal_type !== undefined) updates.mealType = body.meal_type;
  if (body.food_name !== undefined) updates.foodName = body.food_name;
  if (body.calories !== undefined) updates.calories = body.calories;
  if (body.protein !== undefined) updates.protein = body.protein;
  if (body.carbs !== undefined) updates.carbs = body.carbs;
  if (body.fat !== undefined) updates.fat = body.fat;
  if (body.source !== undefined) updates.source = body.source;
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(mealLogs).set(updates).where(eq(mealLogs.id, id)).run();
  const updated = db.select().from(mealLogs).where(eq(mealLogs.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/diet/logs/:id
dietRoutes.delete("/logs/:id", (c) => {
  const { id } = c.req.param();
  db.delete(mealLogs).where(eq(mealLogs.id, id)).run();
  return c.json({ ok: true });
});

// GET /api/kits/diet/goals
dietRoutes.get("/goals", (c) => {
  const row = sqlite.query("SELECT value FROM settings WHERE key = 'diet_goals'").get() as any;
  if (!row) return c.json({ calories: null, protein: null, carbs: null, fat: null });
  return c.json(JSON.parse(row.value));
});

// PATCH /api/kits/diet/goals
dietRoutes.patch("/goals", async (c) => {
  const body = await c.req.json();
  const goals = {
    calories: body.calories ?? null,
    protein: body.protein ?? null,
    carbs: body.carbs ?? null,
    fat: body.fat ?? null,
  };
  sqlite.run(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('diet_goals', ?, datetime('now'))",
    [JSON.stringify(goals)]
  );
  return c.json(goals);
});

// GET /api/kits/diet/summary — 일별 영양소 합계
dietRoutes.get("/summary", (c) => {
  const date = c.req.query("date");
  if (!date) return c.json({ error: "date query required" }, 400);

  const row = sqlite.query<any, [string]>(`
    SELECT
      COUNT(*) as meal_count,
      SUM(calories) as total_calories,
      SUM(protein) as total_protein,
      SUM(carbs) as total_carbs,
      SUM(fat) as total_fat
    FROM meal_logs
    WHERE date = ?
  `).get(date);

  return c.json({ date, ...row });
});
