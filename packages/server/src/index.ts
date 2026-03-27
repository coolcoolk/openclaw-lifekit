import { Hono } from "hono";
import { cors } from "hono/cors";  // Built-in middleware
import { db } from "./db";
import { domainRoutes } from "./routes/domains";
import { areaRoutes } from "./routes/areas";
import { projectRoutes } from "./routes/projects";
import { taskRoutes } from "./routes/tasks";
import { calendarRoutes } from "./routes/calendar";
import { onboardingRoutes } from "./routes/onboarding";
import { settingsRoutes } from "./routes/settings";
import { relationRoutes } from "./routes/relations";
import { reportRoutes } from "./routes/reports";
import { xpRoutes } from "./routes/xp";
import { syncGoogleCalendar } from "./services/googleCalendarSync";
import { seedProjects } from "./db/seedProjects";
import { startReportScheduler } from "./services/reportScheduler";

const app = new Hono();

// CORS for local dev
app.use("*", cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
}));

// Health check
app.get("/", (c) => c.json({
  name: "OpenClaw LifeKit",
  version: "0.1.0",
  status: "running",
}));

// API routes
app.route("/api/domains", domainRoutes);
app.route("/api/areas", areaRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/tasks", taskRoutes);
app.route("/api/calendar", calendarRoutes);
app.route("/api/onboarding", onboardingRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/relations", relationRoutes);
app.route("/api/reports", reportRoutes);
app.route("/api/areas/xp", xpRoutes);

// 프로젝트 시드 데이터 삽입 (데이터 없을 때만)
seedProjects().catch((err) => console.error("[seed] 프로젝트 시드 실패:", err.message));

const port = Number(process.env.PORT) || 4000;
console.log(`🧰 LifeKit server running on http://localhost:${port}`);

// Google Calendar 양방향 동기화: 서버 시작 시 1회 + 5분 폴링
syncGoogleCalendar()
  .then((r) => console.log(`[sync] 초기 동기화: +${r.added} ~${r.updated} ↑${r.pushed}`))
  .catch((err) => console.error("[sync] 초기 동기화 실패:", err.message));

setInterval(() => {
  syncGoogleCalendar()
    .then((r) => console.log(`[sync] 폴링 동기화: +${r.added} ~${r.updated} ↑${r.pushed}`))
    .catch((err) => console.error("[sync] 폴링 동기화 실패:", err.message));
}, 300000);

// 리포트 자동 생성 스케줄러
startReportScheduler();

export default {
  port,
  fetch: app.fetch,
};
