import { db, sqlite } from "../db";
import { reports } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

// KST = UTC+9
const KST_OFFSET = 9 * 60 * 60 * 1000;

function getKSTDate(date = new Date()): Date {
  return new Date(date.getTime() + KST_OFFSET);
}

function getKSTDateStr(date = new Date()): string {
  return getKSTDate(date).toISOString().split("T")[0];
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

function isSunday(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCDay() === 0;
}

async function generateDailyReport(date: string): Promise<void> {
  // 이미 존재하면 스킵
  const existing = db.select().from(reports)
    .where(and(eq(reports.type, "daily"), eq(reports.date, date)))
    .get();

  if (existing) return;

  const id = randomUUIDv7();
  const now = new Date().toISOString();

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

  const meta = {
    totalTasks: dayTasks.length,
    doneTasks: doneTasks.length,
    pendingTasks: pendingTasks.length,
    tasks: dayTasks,
    relationTasks,
  };

  db.insert(reports).values({
    id,
    type: "daily",
    date,
    status: "sent",
    meta: JSON.stringify(meta),
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log(`[report] Daily report generated for ${date}`);
}

async function generateWeeklyReport(mondayDate: string): Promise<void> {
  // 이미 존재하면 스킵
  const existing = db.select().from(reports)
    .where(and(eq(reports.type, "weekly"), eq(reports.date, mondayDate)))
    .get();

  if (existing) return;

  const id = randomUUIDv7();
  const now = new Date().toISOString();

  const startDate = mondayDate;
  const endDateObj = new Date(mondayDate + "T00:00:00Z");
  endDateObj.setUTCDate(endDateObj.getUTCDate() + 6);
  const endDate = endDateObj.toISOString().split("T")[0];

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
  `).all(startDate, endDate, startDate, endDate);

  const doneTasks = weekTasks.filter((t: any) => t.status === "done");

  const domainBalance: Record<string, { name: string; total: number; done: number }> = {};
  for (const t of weekTasks) {
    const key = t.domainId || "none";
    if (!domainBalance[key]) {
      domainBalance[key] = { name: t.domainName || "미분류", total: 0, done: 0 };
    }
    domainBalance[key].total++;
    if (t.status === "done") domainBalance[key].done++;
  }

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

  const meta = {
    totalTasks: weekTasks.length,
    doneTasks: doneTasks.length,
    completionRate: weekTasks.length > 0 ? Math.round((doneTasks.length / weekTasks.length) * 100) : 0,
    domainBalance,
    projectProgress,
    tasks: weekTasks,
  };

  db.insert(reports).values({
    id,
    type: "weekly",
    date: mondayDate,
    dateEnd: endDate,
    status: "sent",
    meta: JSON.stringify(meta),
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log(`[report] Weekly report generated for ${mondayDate} ~ ${endDate}`);
}

export function startReportScheduler() {
  // 매 시간 체크하여, KST 22시대이면 리포트 생성
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1시간마다

  function check() {
    try {
      const kstNow = getKSTDate();
      const kstHour = kstNow.getUTCHours();

      // KST 22:00 ~ 22:59 사이에만 실행
      if (kstHour !== 22) return;

      const todayStr = getKSTDateStr();

      if (isSunday(todayStr)) {
        // 일요일: 주간 리포트 생성
        const monday = getMondayOfWeek(todayStr);
        generateWeeklyReport(monday).catch((err) =>
          console.error("[report] Weekly generation failed:", err.message)
        );
      } else {
        // 나머지: 일일 리포트 생성
        generateDailyReport(todayStr).catch((err) =>
          console.error("[report] Daily generation failed:", err.message)
        );
      }
    } catch (err: any) {
      console.error("[report] Scheduler error:", err.message);
    }
  }

  // 시작 시 1회 체크
  check();

  // 1시간마다 반복
  setInterval(check, CHECK_INTERVAL);

  console.log("[report] Report scheduler started (checks hourly for KST 22:00)");
}
