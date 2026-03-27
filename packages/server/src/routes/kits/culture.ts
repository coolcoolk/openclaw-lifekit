import { Hono } from "hono";
import { db } from "../../db";
import { cultureLogs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const cultureRoutes = new Hono();

// GET /api/kits/culture/logs
cultureRoutes.get("/logs", (c) => {
  const type = c.req.query("type");
  if (type) {
    const rows = db.select().from(cultureLogs).where(eq(cultureLogs.type, type)).all();
    return c.json(rows);
  }
  const rows = db.select().from(cultureLogs).all();
  return c.json(rows);
});

// GET /api/kits/culture/logs/:id
cultureRoutes.get("/logs/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(cultureLogs).where(eq(cultureLogs.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/culture/logs
cultureRoutes.post("/logs", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(cultureLogs).values({
    id,
    type: body.type,
    title: body.title,
    date: body.date,
    withWhom: body.with_whom ? JSON.stringify(body.with_whom) : null,
    rating: body.rating || null,
    review: body.review || null,
    memo: body.memo || null,
    createdAt: now,
  }).run();

  const created = db.select().from(cultureLogs).where(eq(cultureLogs.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/culture/logs/:id
cultureRoutes.patch("/logs/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.type !== undefined) updates.type = body.type;
  if (body.title !== undefined) updates.title = body.title;
  if (body.date !== undefined) updates.date = body.date;
  if (body.with_whom !== undefined) updates.withWhom = JSON.stringify(body.with_whom);
  if (body.rating !== undefined) updates.rating = body.rating;
  if (body.review !== undefined) updates.review = body.review;
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(cultureLogs).set(updates).where(eq(cultureLogs.id, id)).run();
  const updated = db.select().from(cultureLogs).where(eq(cultureLogs.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/culture/logs/:id
cultureRoutes.delete("/logs/:id", (c) => {
  const { id } = c.req.param();
  db.delete(cultureLogs).where(eq(cultureLogs.id, id)).run();
  return c.json({ ok: true });
});
