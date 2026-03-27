import { Hono } from "hono";
import { db, sqlite } from "../db";
import { reports } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const reportRoutes = new Hono();

// GET /api/reports — 리포트 목록 (type 필터)
reportRoutes.get("/", (c) => {
  const type = c.req.query("type"); // daily | weekly

  if (type) {
    const rows = db.select().from(reports).where(eq(reports.type, type)).all();
    return c.json(rows);
  }

  return c.json(db.select().from(reports).all());
});

// POST /api/reports/generate — 자동 생성
reportRoutes.post("/generate", async (c) => {
  const body = await c.req.json();
  const type: string = body.type; // daily | weekly
  const date: string = body.date; // YYYY-MM-DD

  if (!type || !date) {
    return c.json({ error: "type and date are required" }, 400);
  }

  // 이미 생성된 리포트가 있는지 확인
  const existing = db.select().from(reports)
    .where(and(eq(reports.type, type), eq(reports.date, date)))
    .get();

  if (existing) {
    return c.json(existing);
  }

  const id = randomUUIDv7();
  const now = new Date().toISOString();
  let meta: any = {};
  let dateEnd: string | null = null;

  if (type === "daily") {
    // 당일 태스크 스냅샷
    const dayTasks = sqlite.query<any, [string, string]>(`
      SELECT
        t.id, t.title, t.status, t.priority,
        t.area_id AS areaId, t.project_id AS projectId,
        t.completed_at AS completedAt,
        t.relation_ids AS relationIds,
        p.name AS projectName,
        COALESCE(t.linked_domain_id, a.domain_id) AS domainId,
        d.name AS domainName
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN areas a ON t.area_id = a.id
      LEFT JOIN domains d ON COALESCE(t.linked_domain_id, a.domain_id) = d.id
      WHERE date(t.start_at) = ? OR date(t.due_date) = ?
      ORDER BY t.start_at
    `).all(date, date);

    const doneTasks = dayTasks.filter((t: any) => t.status === "done");
    const pendingTasks = dayTasks.filter((t: any) => t.status !== "done");
    const relationTasks = dayTasks.filter((t: any) => t.relationIds && t.relationIds !== "[]");

    meta = {
      totalTasks: dayTasks.length,
      doneTasks: doneTasks.length,
      pendingTasks: pendingTasks.length,
      tasks: dayTasks,
      relationTasks,
    };
  } else if (type === "weekly") {
    // 주간 범위 계산 (date = 월요일)
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    dateEnd = endDate.toISOString().split("T")[0];

    const weekStart = date;
    const weekEnd = dateEnd;

    // 주간 태스크 통계
    const weekTasks = sqlite.query<any, [string, string, string, string]>(`
      SELECT
        t.id, t.title, t.status, t.priority,
        t.area_id AS areaId, t.project_id AS projectId,
        t.completed_at AS completedAt,
        COALESCE(t.linked_domain_id, a.domain_id) AS domainId,
        d.name AS domainName
      FROM tasks t
      LEFT JOIN areas a ON t.area_id = a.id
      LEFT JOIN domains d ON COALESCE(t.linked_domain_id, a.domain_id) = d.id
      WHERE (date(t.start_at) BETWEEN ? AND ?) OR (date(t.due_date) BETWEEN ? AND ?)
      ORDER BY t.start_at
    `).all(weekStart, weekEnd, weekStart, weekEnd);

    const doneTasks = weekTasks.filter((t: any) => t.status === "done");

    // 도메인별 태스크 수 (밸런스)
    const domainBalance: Record<string, { name: string; total: number; done: number }> = {};
    for (const t of weekTasks) {
      const key = t.domainId || "none";
      if (!domainBalance[key]) {
        domainBalance[key] = { name: t.domainName || "미분류", total: 0, done: 0 };
      }
      domainBalance[key].total++;
      if (t.status === "done") domainBalance[key].done++;
    }

    // 프로젝트 진행률
    const projectProgress = sqlite.query<any, []>(`
      SELECT
        p.id, p.name, p.status,
        COUNT(t.id) AS totalTasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS doneTasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id
    `).all();

    meta = {
      totalTasks: weekTasks.length,
      doneTasks: doneTasks.length,
      completionRate: weekTasks.length > 0 ? Math.round((doneTasks.length / weekTasks.length) * 100) : 0,
      domainBalance,
      projectProgress,
      tasks: weekTasks,
    };
  }

  db.insert(reports).values({
    id,
    type,
    date,
    dateEnd,
    status: "draft",
    meta: JSON.stringify(meta),
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(reports).where(eq(reports.id, id)).get();
  return c.json(created, 201);
});

// GET /api/reports/:id
reportRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  const report = db.select().from(reports).where(eq(reports.id, id)).get();
  if (!report) return c.json({ error: "Not found" }, 404);
  return c.json(report);
});

// POST /api/reports — 수동 생성
reportRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(reports).values({
    id,
    type: body.type || "daily",
    date: body.date,
    dateEnd: body.date_end || null,
    status: body.status || "draft",
    diary: body.diary || null,
    nextPlan: body.next_plan || null,
    meta: body.meta ? JSON.stringify(body.meta) : null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(reports).where(eq(reports.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/reports/:id — diary, nextPlan 업데이트
reportRoutes.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.diary !== undefined) updates.diary = body.diary;
  if (body.next_plan !== undefined) updates.nextPlan = body.next_plan;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "sent") updates.sentAt = now;
  }
  if (body.meta !== undefined) updates.meta = JSON.stringify(body.meta);

  db.update(reports).set(updates).where(eq(reports.id, id)).run();
  const updated = db.select().from(reports).where(eq(reports.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});
