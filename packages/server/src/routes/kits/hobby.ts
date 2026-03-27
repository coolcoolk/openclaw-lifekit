import { Hono } from "hono";
import { db } from "../../db";
import { hobbyProjects, hobbyLogs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const hobbyRoutes = new Hono();

// ── Hobby Projects ──

// GET /api/kits/hobby/projects
hobbyRoutes.get("/projects", (c) => {
  const status = c.req.query("status");
  if (status) {
    const rows = db.select().from(hobbyProjects).where(eq(hobbyProjects.status, status)).all();
    return c.json(rows);
  }
  const rows = db.select().from(hobbyProjects).all();
  return c.json(rows);
});

// GET /api/kits/hobby/projects/:id
hobbyRoutes.get("/projects/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(hobbyProjects).where(eq(hobbyProjects.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/hobby/projects
hobbyRoutes.post("/projects", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(hobbyProjects).values({
    id,
    name: body.name,
    icon: body.icon || null,
    status: body.status || "active",
    memo: body.memo || null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(hobbyProjects).where(eq(hobbyProjects.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/hobby/projects/:id
hobbyRoutes.patch("/projects/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.name !== undefined) updates.name = body.name;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.status !== undefined) updates.status = body.status;
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(hobbyProjects).set(updates).where(eq(hobbyProjects.id, id)).run();
  const updated = db.select().from(hobbyProjects).where(eq(hobbyProjects.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/hobby/projects/:id
hobbyRoutes.delete("/projects/:id", (c) => {
  const { id } = c.req.param();
  db.delete(hobbyProjects).where(eq(hobbyProjects.id, id)).run();
  return c.json({ ok: true });
});

// ── Hobby Logs ──

// GET /api/kits/hobby/logs
hobbyRoutes.get("/logs", (c) => {
  const projectId = c.req.query("project_id");
  if (projectId) {
    const rows = db.select().from(hobbyLogs).where(eq(hobbyLogs.projectId, projectId)).all();
    return c.json(rows);
  }
  const rows = db.select().from(hobbyLogs).all();
  return c.json(rows);
});

// GET /api/kits/hobby/logs/:id
hobbyRoutes.get("/logs/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(hobbyLogs).where(eq(hobbyLogs.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/hobby/logs
hobbyRoutes.post("/logs", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(hobbyLogs).values({
    id,
    projectId: body.project_id,
    date: body.date,
    durationMin: body.duration_min || null,
    content: body.content || null,
    memo: body.memo || null,
    createdAt: now,
  }).run();

  const created = db.select().from(hobbyLogs).where(eq(hobbyLogs.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/hobby/logs/:id
hobbyRoutes.patch("/logs/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.project_id !== undefined) updates.projectId = body.project_id;
  if (body.date !== undefined) updates.date = body.date;
  if (body.duration_min !== undefined) updates.durationMin = body.duration_min;
  if (body.content !== undefined) updates.content = body.content;
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(hobbyLogs).set(updates).where(eq(hobbyLogs.id, id)).run();
  const updated = db.select().from(hobbyLogs).where(eq(hobbyLogs.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/hobby/logs/:id
hobbyRoutes.delete("/logs/:id", (c) => {
  const { id } = c.req.param();
  db.delete(hobbyLogs).where(eq(hobbyLogs.id, id)).run();
  return c.json({ ok: true });
});
