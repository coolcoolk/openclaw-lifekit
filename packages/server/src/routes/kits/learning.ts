import { Hono } from "hono";
import { db } from "../../db";
import { learningLogs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const learningRoutes = new Hono();

// GET /api/kits/learning/logs
learningRoutes.get("/logs", (c) => {
  const type = c.req.query("type");
  if (type) {
    const rows = db.select().from(learningLogs).where(eq(learningLogs.type, type)).all();
    return c.json(rows);
  }
  const rows = db.select().from(learningLogs).all();
  return c.json(rows);
});

// GET /api/kits/learning/logs/:id
learningRoutes.get("/logs/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(learningLogs).where(eq(learningLogs.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/learning/logs
learningRoutes.post("/logs", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(learningLogs).values({
    id,
    type: body.type,
    title: body.title,
    author: body.author || null,
    totalPages: body.total_pages || null,
    currentPages: body.current_pages || null,
    progress: body.progress || 0,
    startedAt: body.started_at || now,
    completedAt: body.completed_at || null,
    rating: body.rating || null,
    review: body.review || null,
    memo: body.memo || null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(learningLogs).where(eq(learningLogs.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/learning/logs/:id
learningRoutes.patch("/logs/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.type !== undefined) updates.type = body.type;
  if (body.title !== undefined) updates.title = body.title;
  if (body.author !== undefined) updates.author = body.author;
  if (body.total_pages !== undefined) updates.totalPages = body.total_pages;
  if (body.current_pages !== undefined) updates.currentPages = body.current_pages;
  if (body.progress !== undefined) updates.progress = body.progress;
  if (body.started_at !== undefined) updates.startedAt = body.started_at;
  if (body.completed_at !== undefined) updates.completedAt = body.completed_at;
  if (body.rating !== undefined) updates.rating = body.rating;
  if (body.review !== undefined) updates.review = body.review;
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(learningLogs).set(updates).where(eq(learningLogs.id, id)).run();
  const updated = db.select().from(learningLogs).where(eq(learningLogs.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/learning/logs/:id
learningRoutes.delete("/logs/:id", (c) => {
  const { id } = c.req.param();
  db.delete(learningLogs).where(eq(learningLogs.id, id)).run();
  return c.json({ ok: true });
});
