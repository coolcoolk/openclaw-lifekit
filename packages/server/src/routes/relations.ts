import { Hono } from "hono";
import { db, sqlite } from "../db";
import { relations } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const relationRoutes = new Hono();

// GET /api/relations/stats — 관계 유형별 집계
relationRoutes.get("/stats", (c) => {
  const rows = sqlite.query<{ relationType: string | null; count: number }, []>(`
    SELECT relation_type AS relationType, COUNT(*) AS count
    FROM relations
    GROUP BY relation_type
    ORDER BY count DESC
  `).all();
  return c.json(rows);
});

// GET /api/relations
relationRoutes.get("/", (c) => {
  const rows = db.select().from(relations).all();
  const today = new Date();

  const withScore = rows.map((r) => {
    const appts = sqlite
      .query<{ start_at: string }, [string]>(
        `SELECT t.start_at FROM tasks t, json_each(t.relation_ids) je
         WHERE t.relation_ids IS NOT NULL
           AND t.start_at IS NOT NULL
           AND je.value = ?`
      )
      .all(r.id);

    const score = appts.reduce((sum, a) => {
      const days = Math.floor(
        (today.getTime() - new Date(a.start_at).getTime()) / 86400000
      );
      if (days < 0) return sum;
      return sum + 1 / (days + 30);
    }, 0);

    return { ...r, intimacyScore: Math.round(score * 1000) / 1000 };
  });

  return c.json(withScore);
});

// GET /api/relations/:id
relationRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(relations).where(eq(relations.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);

  const today = new Date();
  const appts = sqlite
    .query<{ start_at: string }, [string]>(
      `SELECT t.start_at FROM tasks t, json_each(t.relation_ids) je
       WHERE t.relation_ids IS NOT NULL
         AND t.start_at IS NOT NULL
         AND je.value = ?`
    )
    .all(id);

  const score = appts.reduce((sum, a) => {
    const days = Math.floor(
      (today.getTime() - new Date(a.start_at).getTime()) / 86400000
    );
    if (days < 0) return sum;
    return sum + 1 / (days + 30);
  }, 0);

  return c.json({ ...row, intimacyScore: Math.round(score * 1000) / 1000 });
});

// POST /api/relations
relationRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(relations).values({
    id,
    name: body.name,
    nickname: body.nickname || null,
    relationType: body.relation_type || null,
    birthday: body.birthday || null,
    memo: body.memo || null,
    lastMetAt: body.last_met_at || null,
    meetingCount: body.meeting_count || 0,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(relations).where(eq(relations.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/relations/:id
relationRoutes.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.name !== undefined) updates.name = body.name;
  if (body.nickname !== undefined) updates.nickname = body.nickname;
  if (body.relation_type !== undefined) updates.relationType = body.relation_type;
  if (body.birthday !== undefined) updates.birthday = body.birthday;
  if (body.memo !== undefined) updates.memo = body.memo;
  if (body.last_met_at !== undefined) updates.lastMetAt = body.last_met_at;
  if (body.meeting_count !== undefined) updates.meetingCount = body.meeting_count;

  db.update(relations).set(updates).where(eq(relations.id, id)).run();
  const updated = db.select().from(relations).where(eq(relations.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/relations/:id
relationRoutes.delete("/:id", (c) => {
  const { id } = c.req.param();
  db.delete(relations).where(eq(relations.id, id)).run();
  return c.json({ ok: true });
});
