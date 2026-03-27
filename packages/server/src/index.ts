import { Hono } from "hono";
import { cors } from "hono/cors";  // Built-in middleware
import { db, sqlite } from "./db";
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
import { kitRoutes } from "./routes/kits";
import { exerciseRoutes } from "./routes/kits/exercise";
import { dietRoutes } from "./routes/kits/diet";
import { financeRoutes } from "./routes/kits/finance";
import { investmentRoutes } from "./routes/kits/investment";
import { learningRoutes } from "./routes/kits/learning";
import { cultureRoutes } from "./routes/kits/culture";
import { hobbyRoutes } from "./routes/kits/hobby";
import { fashionRoutes } from "./routes/kits/fashion";
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

// Kit routes
app.route("/api/kits", kitRoutes);
app.route("/api/kits/exercise", exerciseRoutes);
app.route("/api/kits/diet", dietRoutes);
app.route("/api/kits/finance", financeRoutes);
app.route("/api/kits/investment", investmentRoutes);
app.route("/api/kits/learning", learningRoutes);
app.route("/api/kits/culture", cultureRoutes);
app.route("/api/kits/hobby", hobbyRoutes);
app.route("/api/kits/fashion", fashionRoutes);

// 도메인/영역 시드 (새 DB일 때만)
import { domains as domainsTable, areas as areasTable } from "./db/schema";
const domainCount = sqlite.query<{ cnt: number }, []>("SELECT COUNT(*) as cnt FROM domains").get();
if (!domainCount || domainCount.cnt === 0) {
  const DOMAINS = [
    { id: "health", name: "건강", icon: "🏥", color: "#22c55e", sortOrder: 1, isSystem: true },
    { id: "work", name: "일", icon: "💼", color: "#3b82f6", sortOrder: 2, isSystem: true },
    { id: "finance", name: "재무", icon: "💰", color: "#a855f7", sortOrder: 3, isSystem: true },
    { id: "relationship", name: "관계", icon: "💕", color: "#ec4899", sortOrder: 4, isSystem: true },
    { id: "growth", name: "성장/여가", icon: "🌱", color: "#84cc16", sortOrder: 5, isSystem: true },
    { id: "appearance", name: "외모", icon: "👔", color: "#f59e0b", sortOrder: 6, isSystem: true },
    { id: "living", name: "생활", icon: "🏠", color: "#6b7280", sortOrder: 7, isSystem: true },
  ];
  const AREAS = [
    { id: "health-exercise", domainId: "health", name: "운동/신체", icon: "💪", sortOrder: 1 },
    { id: "health-mental", domainId: "health", name: "정신/마음", icon: "🧠", sortOrder: 2 },
    { id: "health-diet", domainId: "health", name: "식습관", icon: "🥗", sortOrder: 3 },
    { id: "work-job", domainId: "work", name: "직장", icon: "🏢", sortOrder: 1 },
    { id: "work-business", domainId: "work", name: "사업", icon: "🚀", sortOrder: 2 },
    { id: "work-side", domainId: "work", name: "부업", icon: "⚡", sortOrder: 3 },
    { id: "finance-spending", domainId: "finance", name: "소비/저축", icon: "💳", sortOrder: 1 },
    { id: "finance-invest", domainId: "finance", name: "투자", icon: "📈", sortOrder: 2 },
    { id: "rel-lover", domainId: "relationship", name: "연인", icon: "❤️", sortOrder: 1 },
    { id: "rel-friends", domainId: "relationship", name: "친구", icon: "🤝", sortOrder: 2 },
    { id: "rel-family", domainId: "relationship", name: "가족", icon: "👨‍👩‍👧‍👦", sortOrder: 3 },
    { id: "rel-pet", domainId: "relationship", name: "반려동물", icon: "🐱", sortOrder: 4 },
    { id: "growth-self", domainId: "growth", name: "자기계발", icon: "📚", sortOrder: 1 },
    { id: "growth-culture", domainId: "growth", name: "문화생활", icon: "🎭", sortOrder: 2 },
    { id: "growth-hobby", domainId: "growth", name: "취미활동", icon: "🎨", sortOrder: 3 },
    { id: "growth-travel", domainId: "growth", name: "여행", icon: "✈️", sortOrder: 4 },
    { id: "appear-fashion", domainId: "appearance", name: "패션", icon: "👔", sortOrder: 1 },
    { id: "appear-skincare", domainId: "appearance", name: "스킨케어/위생", icon: "🧴", sortOrder: 2 },
    { id: "living-housework", domainId: "living", name: "가사", icon: "🧹", sortOrder: 1 },
    { id: "living-admin", domainId: "living", name: "생활관리", icon: "📋", sortOrder: 2 },
  ];
  const now = new Date().toISOString();
  for (const d of DOMAINS) {
    db.insert(domainsTable).values({ ...d, createdAt: now, updatedAt: now }).run();
  }
  for (const a of AREAS) {
    db.insert(areasTable).values({ ...a, createdAt: now, updatedAt: now }).run();
  }
  console.log("🌱 도메인/영역 시드 완료");
}

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
