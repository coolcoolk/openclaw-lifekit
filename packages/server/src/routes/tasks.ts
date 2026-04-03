import { Hono } from "hono";
import { db, sqlite } from "../db";
import { tasks, projects, relations } from "../db/schema";
import { eq, and, gte, lte, isNull, not, or, sql } from "drizzle-orm";
import { randomUUIDv7 } from "bun";
import {
  pushEventToGoogle,
  updateEventOnGoogle,
  deleteEventFromGoogle,
} from "../services/googleCalendarSync";
import { addXp } from "./xp";

export const taskRoutes = new Hono();

// GET /api/tasks/balance — 도메인별 완료 태스크 수
taskRoutes.get("/balance", (c) => {
  const days = Number(c.req.query("days")) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const rows = sqlite.query<{ domainId: string; domainName: string; count: number }, [string]>(`
    SELECT
      d.id   AS domainId,
      d.name AS domainName,
      COUNT(t.id) AS count
    FROM tasks t
    JOIN areas a ON t.area_id = a.id
    JOIN domains d ON a.domain_id = d.id
    WHERE t.status = 'done'
      AND t.completed_at >= ?
    GROUP BY d.id, d.name
    ORDER BY d.sort_order
  `).all(sinceStr);

  return c.json(rows);
});

// GET /api/tasks
taskRoutes.get("/", (c) => {
  const view = c.req.query("view"); // calendar | backlog
  const projectId = c.req.query("project_id");
  const areaId = c.req.query("area_id");
  const status = c.req.query("status");
  const priority = c.req.query("priority");
  const before = c.req.query("before"); // YYYY-MM-DD: dueDate <= before OR dueDate IS NULL
  const start = c.req.query("start"); // 캘린더 뷰 시작 범위
  const end = c.req.query("end"); // 캘린더 뷰 끝 범위
  const relationId = c.req.query("relation_id"); // 특정 관계의 약속 조회

  // relation_id 필터: relation_ids JSON array에 해당 id가 포함된 태스크
  if (relationId) {
    const rows = sqlite.query<any, [string]>(`
      SELECT
        t.id, t.project_id AS projectId, t.area_id AS areaId,
        t.title, t.description, t.status, t.priority,
        t.due_date AS dueDate, t.completed_at AS completedAt,
        t.is_routine AS isRoutine, t.tags, t.sort_order AS sortOrder,
        t.estimated_minutes AS estimatedMinutes,
        t.start_at AS startAt, t.end_at AS endAt,
        t.all_day AS allDay, t.location, t.source,
        t.external_id AS externalId, t.color,
        t.linked_domain_id AS linkedDomainId,
        t.relation_ids AS relationIds,
        p.name AS projectName,
        COALESCE(t.linked_domain_id, a.domain_id) AS domainId
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN areas a ON t.area_id = a.id
      WHERE t.relation_ids LIKE '%' || ? || '%'
      ORDER BY t.start_at DESC
    `).all(relationId);
    return c.json(rows);
  }

  // view=calendar: start_at이 있는 태스크 (캘린더용)
  if (view === "calendar") {
    const conditions: string[] = ["t.start_at IS NOT NULL"];
    const params: any[] = [];

    if (start) {
      conditions.push("t.start_at >= ?");
      params.push(start);
    }
    if (end) {
      conditions.push("t.start_at <= ?");
      params.push(end);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const rows = sqlite.query<any, any[]>(`
      SELECT
        t.id, t.project_id AS projectId, t.area_id AS areaId,
        t.title, t.description, t.status, t.priority,
        t.due_date AS dueDate, t.completed_at AS completedAt,
        t.is_routine AS isRoutine, t.tags, t.sort_order AS sortOrder,
        t.estimated_minutes AS estimatedMinutes,
        t.start_at AS startAt, t.end_at AS endAt,
        t.all_day AS allDay, t.location, t.source,
        t.external_id AS externalId, t.color,
        t.linked_domain_id AS linkedDomainId,
        p.name AS projectName,
        COALESCE(t.linked_domain_id, a.domain_id) AS domainId
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN areas a ON t.area_id = a.id
      ${whereClause}
      ORDER BY t.start_at
    `).all(...params);

    return c.json(rows);
  }

  // view=backlog: start_at이 없는 미완료 태스크 (사이드바용)
  if (view === "backlog") {
    const conditions: string[] = ["t.start_at IS NULL", "t.status != 'done'", "t.status != 'cancelled'"];
    const params: any[] = [];

    if (projectId) {
      conditions.push("t.project_id = ?");
      params.push(projectId);
    }
    if (areaId) {
      conditions.push("t.area_id = ?");
      params.push(areaId);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const rows = sqlite.query<any, any[]>(`
      SELECT
        t.id, t.project_id AS projectId, t.area_id AS areaId,
        t.title, t.description, t.status, t.priority,
        t.due_date AS dueDate, t.completed_at AS completedAt,
        t.is_routine AS isRoutine, t.tags, t.sort_order AS sortOrder,
        t.estimated_minutes AS estimatedMinutes,
        t.start_at AS startAt, t.end_at AS endAt,
        p.name AS projectName,
        COALESCE(t.linked_domain_id, a.domain_id) AS domainId
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN areas a ON t.area_id = a.id
      ${whereClause}
      ORDER BY t.sort_order
    `).all(...params);

    return c.json(rows);
  }

  // before 파라미터가 있으면 raw SQL로 프로젝트명 JOIN
  if (before) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push("t.status = ?");
      params.push(status);
    }
    if (projectId) {
      conditions.push("t.project_id = ?");
      params.push(projectId);
    }
    if (areaId) {
      conditions.push("t.area_id = ?");
      params.push(areaId);
    }
    if (priority) {
      conditions.push("t.priority = ?");
      params.push(priority);
    }

    // dueDate <= before OR dueDate IS NULL
    conditions.push("(t.due_date <= ? OR t.due_date IS NULL)");
    params.push(before);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = sqlite.query<any, any[]>(`
      SELECT
        t.id, t.project_id AS projectId, t.area_id AS areaId,
        t.title, t.description, t.status, t.priority,
        t.due_date AS dueDate, t.completed_at AS completedAt,
        t.is_routine AS isRoutine, t.tags, t.sort_order AS sortOrder,
        t.estimated_minutes AS estimatedMinutes,
        t.start_at AS startAt, t.end_at AS endAt,
        p.name AS projectName,
        COALESCE(t.linked_domain_id, a.domain_id) AS domainId
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN areas a ON t.area_id = a.id
      ${whereClause}
      ORDER BY t.sort_order
    `).all(...params);

    return c.json(rows);
  }

  // 기존 로직 (before 없을 때)
  let result = db.select().from(tasks);
  const conditions = [];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (areaId) conditions.push(eq(tasks.areaId, areaId));
  if (status) conditions.push(eq(tasks.status, status));
  if (priority) conditions.push(eq(tasks.priority, priority));

  if (conditions.length > 0) {
    result = result.where(and(...conditions));
  }

  return c.json(result.orderBy(tasks.sortOrder).all());
});

// GET /api/tasks/:id
taskRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) return c.json({ error: "Not found" }, 404);
  return c.json(task);
});

// POST /api/tasks
taskRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(tasks).values({
    id,
    projectId: body.project_id || null,
    areaId: body.area_id || null,
    title: body.title,
    description: body.description || null,
    status: body.status || "todo",
    priority: body.priority || "P2",
    dueDate: body.due_date || null,
    isRoutine: body.is_routine || false,
    routineRule: body.routine_rule || null,
    estimatedMinutes: body.estimated_minutes || null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    sortOrder: body.sort_order || 0,
    // Calendar fields
    startAt: body.start_at || null,
    endAt: body.end_at || null,
    allDay: body.all_day || false,
    location: body.location || null,
    source: body.source || "manual",
    externalId: body.external_id || null,
    color: body.color || null,
    linkedDomainId: body.linked_domain_id || null,
    relationIds: body.relation_ids ? JSON.stringify(body.relation_ids) : null,
    createdAt: now,
    updatedAt: now,
  }).run();

  let created = db.select().from(tasks).where(eq(tasks.id, id)).get();

  // 시간이 있는 태스크 → 구글 캘린더에 push
  if (created && created.startAt && created.source !== "google") {
    try {
      pushEventToGoogle(created);
      created = db.select().from(tasks).where(eq(tasks.id, id)).get();
    } catch (err: any) {
      console.error("[tasks] Google push failed:", err.message);
    }
  }

  return c.json(created, 201);
});

// PATCH /api/tasks/:id
taskRoutes.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) return c.json({ error: "Not found" }, 404);

  const updates: Record<string, any> = { updatedAt: now };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "done") updates.completedAt = now;
  }
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.project_id !== undefined) updates.projectId = body.project_id;
  if (body.area_id !== undefined) updates.areaId = body.area_id;
  if (body.due_date !== undefined) updates.dueDate = body.due_date;
  if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags);
  if (body.sort_order !== undefined) updates.sortOrder = body.sort_order;
  if (body.estimated_minutes !== undefined) updates.estimatedMinutes = body.estimated_minutes;
  // Calendar fields
  if (body.start_at !== undefined) updates.startAt = body.start_at;
  if (body.end_at !== undefined) updates.endAt = body.end_at;
  if (body.all_day !== undefined) updates.allDay = body.all_day;
  if (body.location !== undefined) updates.location = body.location;
  if (body.color !== undefined) updates.color = body.color;
  if (body.linked_domain_id !== undefined) updates.linkedDomainId = body.linked_domain_id;
  if (body.relation_ids !== undefined) updates.relationIds = JSON.stringify(body.relation_ids);

  db.update(tasks).set(updates).where(eq(tasks.id, id)).run();
  const updated = db.select().from(tasks).where(eq(tasks.id, id)).get();

  // 태스크 완료 시 관계 인물 lastMetAt, meetingCount 업데이트
  if (body.status === "done" && updated?.relationIds) {
    try {
      const relationIdList: string[] = JSON.parse(updated.relationIds);
      for (const relId of relationIdList) {
        const rel = db.select().from(relations).where(eq(relations.id, relId)).get();
        if (rel) {
          db.update(relations).set({
            lastMetAt: now,
            meetingCount: (rel.meetingCount ?? 0) + 1,
            updatedAt: now,
          }).where(eq(relations.id, relId)).run();
        }
      }
    } catch { /* invalid JSON — ignore */ }
  }

  // 태스크 완료 시 XP 부여 (+10 해당 Area)
  if (body.status === "done" && existing.status !== "done" && updated?.areaId) {
    try {
      await addXp(updated.areaId, 10, "task_complete");
    } catch { /* XP 처리 실패 — 무시 */ }
  }

  // 구글 캘린더에 반영 (시간이 있는 태스크만)
  if (updated?.startAt && updated?.externalId) {
    try {
      updateEventOnGoogle(updated);
    } catch (err: any) {
      console.error("[tasks] Google update failed:", err.message);
    }
  }

  return c.json(updated);
});

// DELETE /api/tasks/:id
taskRoutes.delete("/:id", (c) => {
  const { id } = c.req.param();

  const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existing) return c.json({ error: "Not found" }, 404);

  // 구글 캘린더에서 삭제
  if (existing.externalId) {
    try {
      deleteEventFromGoogle(existing.externalId);
    } catch (err: any) {
      console.error("[tasks] Google delete failed:", err.message);
    }
  }

  db.delete(tasks).where(eq(tasks.id, id)).run();
  return c.json({ ok: true });
});
