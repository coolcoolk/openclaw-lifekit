import { Hono } from "hono";
import { db, sqlite } from "../db";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const projectRoutes = new Hono();

// GET /api/projects/with-tasks — 프로젝트 + 태스크 집계 + 도메인 정보
projectRoutes.get("/with-tasks", (c) => {
  const rows = sqlite.query<{
    id: string;
    areaId: string | null;
    name: string;
    description: string | null;
    status: string;
    targetDate: string | null;
    createdAt: string;
    updatedAt: string;
    domainId: string | null;
    domainName: string | null;
    domainIcon: string | null;
    domainColor: string | null;
    totalTasks: number;
    doneTasks: number;
    routineTasks: number;
    todayTask: string | null;
  }, []>(`
    SELECT
      p.id, p.area_id AS areaId, p.name, p.description, p.status,
      p.target_date AS targetDate, p.created_at AS createdAt, p.updated_at AS updatedAt,
      d.id AS domainId, d.name AS domainName, d.icon AS domainIcon, d.color AS domainColor,
      COUNT(t.id) AS totalTasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS doneTasks,
      SUM(CASE WHEN t.is_routine = 1 THEN 1 ELSE 0 END) AS routineTasks,
      (SELECT t2.title FROM tasks t2 WHERE t2.project_id = p.id AND t2.status != 'done' LIMIT 1) AS todayTask
    FROM projects p
    LEFT JOIN areas a ON p.area_id = a.id
    LEFT JOIN domains d ON a.domain_id = d.id
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY d.sort_order, p.status
  `).all();

  return c.json(rows);
});

// GET /api/projects
projectRoutes.get("/", (c) => {
  const areaId = c.req.query("area_id");
  const status = c.req.query("status");

  let query = db.select().from(projects);
  if (areaId) query = query.where(eq(projects.areaId, areaId));
  if (status) query = query.where(eq(projects.status, status));

  return c.json(query.all());
});

// GET /api/projects/:id
projectRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  const project = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return c.json({ error: "Not found" }, 404);
  return c.json(project);
});

// POST /api/projects
projectRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(projects).values({
    id,
    areaId: body.area_id || null,
    name: body.name,
    description: body.description || null,
    status: body.status || "active",
    targetDate: body.target_date || null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(projects).where(eq(projects.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/projects/:id
projectRoutes.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.area_id !== undefined) updates.areaId = body.area_id;
  if (body.target_date !== undefined) updates.targetDate = body.target_date;

  db.update(projects).set(updates).where(eq(projects.id, id)).run();
  const updated = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/projects/:id
projectRoutes.delete("/:id", (c) => {
  const { id } = c.req.param();
  // 연결된 태스크 먼저 삭제
  sqlite.run(`DELETE FROM tasks WHERE project_id = ?`, [id]);
  db.delete(projects).where(eq(projects.id, id)).run();
  return c.json({ ok: true });
});
