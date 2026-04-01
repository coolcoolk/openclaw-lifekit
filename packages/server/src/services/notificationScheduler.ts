import { db, sqlite } from "../db";
import { reports } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUIDv7 } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// ── 설정 ──
const SETTINGS_FILE = join(import.meta.dir, "../../data/settings.json");
const KST_OFFSET = 9 * 60 * 60 * 1000;
const SERVER_BASE = "http://localhost:4000";

// 중복 실행 방지용
const executedJobs = new Map<string, number>(); // key -> timestamp

function getKSTDate(date = new Date()): Date {
  return new Date(date.getTime() + KST_OFFSET);
}

function getKSTDateStr(date = new Date()): string {
  return getKSTDate(date).toISOString().split("T")[0];
}

function getKSTTimeStr(date = new Date()): string {
  const kst = getKSTDate(date);
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const m = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

interface RoutineSettings {
  briefingTime: string;
  reviewTime: string;
  weeklyReviewTime: string;
  weeklyReviewDay: number;
}

function loadSettings(): RoutineSettings {
  const defaults: RoutineSettings = {
    briefingTime: "08:00",
    reviewTime: "22:00",
    weeklyReviewTime: "21:00",
    weeklyReviewDay: 0,
  };

  if (!existsSync(SETTINGS_FILE)) return defaults;

  try {
    const data = JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
    return {
      briefingTime: data?.routine?.briefingTime || defaults.briefingTime,
      reviewTime: data?.routine?.reviewTime || defaults.reviewTime,
      weeklyReviewTime: data?.routine?.weeklyReviewTime || defaults.weeklyReviewTime,
      weeklyReviewDay: data?.routine?.weeklyReviewDay ?? defaults.weeklyReviewDay,
    };
  } catch {
    return defaults;
  }
}

function isGatewayConfigured(): boolean {
  return !!(process.env.OPENCLAW_GATEWAY_URL && process.env.OPENCLAW_GATEWAY_TOKEN);
}

// 중복 실행 방지: 같은 작업을 같은 분(minute)에 다시 실행하지 않음
function shouldRun(jobKey: string): boolean {
  const now = Math.floor(Date.now() / 60000); // 분 단위
  const last = executedJobs.get(jobKey);
  if (last === now) return false;
  executedJobs.set(jobKey, now);

  // 오래된 키 정리 (24시간 이상)
  const cutoff = now - 1440;
  for (const [k, v] of executedJobs) {
    if (v < cutoff) executedJobs.delete(k);
  }
  return true;
}

// ── Kit 활성화 상태 확인 ──
function isKitInstalled(kitId: string): boolean {
  try {
    const row = sqlite
      .query<{ cnt: number }, [string]>("SELECT COUNT(*) as cnt FROM area_kits WHERE kit_id = ?")
      .get(kitId);
    return (row?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}

// ── API 호출 헬퍼 ──
async function fetchAPI(path: string): Promise<any> {
  try {
    const res = await fetch(`${SERVER_BASE}${path}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[scheduler] API fetch failed: ${path}`, err);
    return null;
  }
}

// ── OpenClaw 게이트웨이 통신 ──

/**
 * OpenClaw 게이트웨이에 프롬프트를 보내고 AI 응답 텍스트를 반환.
 * 에이전트가 message tool로 텔레그램 전송까지 처리함.
 */
async function sendToGateway(prompt: string, maxTokens?: number): Promise<string | null> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  const agentId = process.env.OPENCLAW_AGENT_ID || "main";

  if (!gatewayUrl || !gatewayToken) {
    console.error("[scheduler] Gateway not configured (OPENCLAW_GATEWAY_URL / OPENCLAW_GATEWAY_TOKEN)");
    return null;
  }

  try {
    const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
      signal: AbortSignal.timeout(120000), // 2분 타임아웃
    });

    if (!res.ok) {
      console.error(`[scheduler] Gateway error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content || null;
    console.log(`[scheduler] Gateway response:`, content?.slice(0, 100) || "(empty)");
    return content;
  } catch (err) {
    console.error("[scheduler] Gateway request failed:", err);
    return null;
  }
}

/**
 * 텔레그램에 직접 메시지 전송 (AI 생성 없이).
 * 에이전트에게 "이 메시지를 그대로 보내라"고 지시.
 */
async function sendDirectMessage(content: string): Promise<void> {
  const prompt = `다음 메시지를 텔레그램으로 전송해줘. 메시지 내용만 그대로 보내고 다른 말은 추가하지 마. 전송 후 NO_REPLY로만 응답해:

${content}`;

  await sendToGateway(prompt, 50);
}

/**
 * AI가 내용을 생성한 후 텔레그램으로 전송.
 * 프롬프트로 AI가 응답을 생성하면, 그 응답을 다시 에이전트를 통해 전송.
 */
async function generateAndSendMessage(prompt: string, systemContext?: string): Promise<string | null> {
  const fullPrompt = `${systemContext ? `[시스템 컨텍스트: ${systemContext}]\n\n` : ""}${prompt}

위 내용을 바탕으로 메시지를 작성하고 텔레그램으로 전송해줘. 전송 후 NO_REPLY로만 응답해.`;

  return await sendToGateway(fullPrompt);
}

// ══════════════════════════════════════════
// 1. 약속 리마인더 (15분마다)
// ══════════════════════════════════════════
async function checkUpcomingEvents(): Promise<void> {
  const jobKey = `reminder-${getKSTTimeStr()}`;
  if (!shouldRun(jobKey)) return;

  try {
    const data = await fetchAPI("/api/tasks?view=calendar");
    if (!data || !Array.isArray(data)) return;

    const now = new Date();
    const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

    const upcoming = data.filter((task: any) => {
      if (!task.startAt) return false;
      const startTime = new Date(task.startAt);
      return startTime > now && startTime <= thirtyMinLater;
    });

    if (upcoming.length === 0) return;

    const eventLines = upcoming
      .map((t: any) => {
        const time = new Date(t.startAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Seoul",
        });
        const location = t.location ? `\n  📍 ${t.location}` : "";
        return `📌 ${t.title} — ${time}${location}`;
      })
      .join("\n");

    const message = `⏰ 30분 후 약속이 있어요!\n\n${eventLines}`;
    await sendDirectMessage(message);

    console.log(`[scheduler] Reminder sent for ${upcoming.length} upcoming event(s)`);
  } catch (err) {
    console.error("[scheduler] Reminder check failed:", err);
  }
}

// ══════════════════════════════════════════
// 2. 식단·운동 브리핑
// ══════════════════════════════════════════
async function sendDailyBriefing(): Promise<void> {
  const todayStr = getKSTDateStr();
  const jobKey = `briefing-${todayStr}`;
  if (!shouldRun(jobKey)) return;

  const hasDiet = isKitInstalled("diet");
  const hasExercise = isKitInstalled("exercise");

  if (!hasDiet && !hasExercise) {
    console.log("[scheduler] No diet/exercise kits installed, skipping briefing");
    return;
  }

  let promptParts: string[] = [];

  if (hasDiet) {
    const dietData = await fetchAPI(`/api/kits/diet/summary?date=${todayStr}`);
    if (dietData) {
      promptParts.push(`## 오늘의 식단 기록\n${JSON.stringify(dietData, null, 2)}`);
    }
  }

  if (hasExercise) {
    const exerciseData = await fetchAPI(`/api/kits/exercise/logs?date=${todayStr}`);
    if (exerciseData) {
      promptParts.push(`## 오늘의 운동 기록\n${JSON.stringify(exerciseData, null, 2)}`);
    }
  }

  if (promptParts.length === 0) {
    console.log("[scheduler] No diet/exercise data today, skipping briefing");
    return;
  }

  await generateAndSendMessage(
    `오늘 하루의 건강 기록을 요약해주세요:\n\n${promptParts.join("\n\n")}`,
    "LifeKit 건강 브리핑 봇. 오늘의 식단과 운동 기록을 간결하게 요약하고, 긍정적인 피드백과 개선점을 짧게 제안. 이모지 활용."
  );

  console.log(`[scheduler] Daily briefing sent for ${todayStr}`);
}

// ══════════════════════════════════════════
// 3. 일일 회고
// ══════════════════════════════════════════
async function generateDailyReview(): Promise<void> {
  const todayStr = getKSTDateStr();
  const jobKey = `daily-review-${todayStr}`;
  if (!shouldRun(jobKey)) return;

  // 이미 리포트 있으면 스킵
  const existing = db
    .select()
    .from(reports)
    .where(and(eq(reports.type, "daily"), eq(reports.date, todayStr)))
    .get();
  if (existing) return;

  // 오늘 태스크 수집
  const dayTasks = sqlite
    .query<any, [string, string]>(
      `SELECT t.id, t.title, t.status, t.priority,
              t.completed_at AS completedAt,
              p.name AS projectName,
              d.name AS domainName
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN areas a ON t.area_id = a.id
       LEFT JOIN domains d ON COALESCE(t.linked_domain_id, a.domain_id) = d.id
       WHERE date(t.start_at) = ? OR date(t.due_date) = ?
       ORDER BY t.start_at`
    )
    .all(todayStr, todayStr);

  const doneTasks = dayTasks.filter((t: any) => t.status === "done");
  const pendingTasks = dayTasks.filter((t: any) => t.status !== "done");

  // Kit 데이터 수집
  let kitSummary = "";
  if (isKitInstalled("exercise")) {
    const exerciseData = await fetchAPI(`/api/kits/exercise/logs?date=${todayStr}`);
    if (exerciseData) kitSummary += `\n운동: ${JSON.stringify(exerciseData)}`;
  }
  if (isKitInstalled("diet")) {
    const dietData = await fetchAPI(`/api/kits/diet/summary?date=${todayStr}`);
    if (dietData) kitSummary += `\n식단: ${JSON.stringify(dietData)}`;
  }

  const prompt = `오늘(${todayStr}) 하루를 회고해주세요.

## 완료한 태스크 (${doneTasks.length}개)
${doneTasks.map((t: any) => `- ${t.title} (${t.domainName || "미분류"})`).join("\n") || "없음"}

## 미완료 태스크 (${pendingTasks.length}개)
${pendingTasks.map((t: any) => `- ${t.title} (${t.domainName || "미분류"})`).join("\n") || "없음"}

${kitSummary ? `## 건강/활동 기록${kitSummary}` : ""}

짧고 따뜻한 하루 회고를 작성해주세요.`;

  const reviewContent = await generateAndSendMessage(
    prompt,
    "LifeKit 일일 회고 봇. 하루를 간결하게 정리하고, 잘한 점과 개선할 점을 짧게 언급. 격려하는 톤."
  );

  // reports DB에 저장
  const id = randomUUIDv7();
  const now = new Date().toISOString();
  const meta = {
    totalTasks: dayTasks.length,
    doneTasks: doneTasks.length,
    pendingTasks: pendingTasks.length,
    tasks: dayTasks,
  };

  db.insert(reports)
    .values({
      id,
      type: "daily",
      date: todayStr,
      status: "sent",
      diary: reviewContent || undefined,
      meta: JSON.stringify(meta),
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log(`[scheduler] Daily review generated and sent for ${todayStr}`);
}

// ══════════════════════════════════════════
// 4. 주간 회고
// ══════════════════════════════════════════
async function generateWeeklyReview(): Promise<void> {
  const todayStr = getKSTDateStr();

  // 이번 주 월요일 계산
  const d = new Date(todayStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  const mondayStr = d.toISOString().split("T")[0];

  const jobKey = `weekly-review-${mondayStr}`;
  if (!shouldRun(jobKey)) return;

  // 이미 리포트 있으면 스킵
  const existing = db
    .select()
    .from(reports)
    .where(and(eq(reports.type, "weekly"), eq(reports.date, mondayStr)))
    .get();
  if (existing) return;

  const endDateObj = new Date(mondayStr + "T00:00:00Z");
  endDateObj.setUTCDate(endDateObj.getUTCDate() + 6);
  const endDate = endDateObj.toISOString().split("T")[0];

  // 이번 주 태스크
  const weekTasks = sqlite
    .query<any, [string, string, string, string]>(
      `SELECT t.id, t.title, t.status, t.priority,
              t.completed_at AS completedAt,
              p.name AS projectName,
              d.name AS domainName
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN areas a ON t.area_id = a.id
       LEFT JOIN domains d ON COALESCE(t.linked_domain_id, a.domain_id) = d.id
       WHERE (date(t.start_at) BETWEEN ? AND ?) OR (date(t.due_date) BETWEEN ? AND ?)
       ORDER BY t.start_at`
    )
    .all(mondayStr, endDate, mondayStr, endDate);

  const doneTasks = weekTasks.filter((t: any) => t.status === "done");

  // 도메인별 집계
  const domainStats: Record<string, { total: number; done: number }> = {};
  for (const t of weekTasks) {
    const domain = t.domainName || "미분류";
    if (!domainStats[domain]) domainStats[domain] = { total: 0, done: 0 };
    domainStats[domain].total++;
    if (t.status === "done") domainStats[domain].done++;
  }

  const domainSummary = Object.entries(domainStats)
    .map(([name, stats]) => `- ${name}: ${stats.done}/${stats.total} 완료`)
    .join("\n");

  const completionRate =
    weekTasks.length > 0 ? Math.round((doneTasks.length / weekTasks.length) * 100) : 0;

  const prompt = `이번 주(${mondayStr} ~ ${endDate}) 주간 회고를 작성해주세요.

## 전체 현황
- 총 태스크: ${weekTasks.length}개
- 완료: ${doneTasks.length}개 (${completionRate}%)

## 영역별 현황
${domainSummary || "데이터 없음"}

## 완료한 태스크
${doneTasks.map((t: any) => `- ${t.title}`).join("\n") || "없음"}

주간 회고를 작성하고, 다음 주를 위한 간단한 제안을 해주세요.`;

  const reviewContent = await generateAndSendMessage(
    prompt,
    "LifeKit 주간 회고 봇. 한 주를 종합적으로 정리하고, 영역별 밸런스를 평가하며, 다음 주를 위한 실질적인 제안."
  );

  // reports DB에 저장
  const id = randomUUIDv7();
  const now = new Date().toISOString();
  const meta = {
    totalTasks: weekTasks.length,
    doneTasks: doneTasks.length,
    completionRate,
    domainStats,
    tasks: weekTasks,
  };

  db.insert(reports)
    .values({
      id,
      type: "weekly",
      date: mondayStr,
      dateEnd: endDate,
      status: "sent",
      diary: reviewContent || undefined,
      meta: JSON.stringify(meta),
      sentAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log(`[scheduler] Weekly review generated and sent for ${mondayStr} ~ ${endDate}`);
}

// ══════════════════════════════════════════
// 메인 스케줄러
// ══════════════════════════════════════════
export function startNotificationScheduler(): void {
  if (!isGatewayConfigured()) {
    console.log("[scheduler] OpenClaw gateway not configured (OPENCLAW_GATEWAY_URL / OPENCLAW_GATEWAY_TOKEN), notification scheduler disabled");
    return;
  }

  const CHECK_INTERVAL = 60 * 1000; // 매 분마다 체크

  async function tick() {
    try {
      const settings = loadSettings();
      const kstNow = getKSTDate();
      const currentTime = getKSTTimeStr();
      const currentDay = kstNow.getUTCDay(); // 0=일, 6=토

      // 1. 약속 리마인더: 15분마다 (분이 0, 15, 30, 45일 때)
      const currentMinute = kstNow.getUTCMinutes();
      if (currentMinute % 15 === 0) {
        checkUpcomingEvents().catch((err) =>
          console.error("[scheduler] Reminder failed:", err.message)
        );
      }

      // 2. 식단·운동 브리핑 + 일일 회고: reviewTime에 실행
      if (currentTime === settings.reviewTime) {
        sendDailyBriefing().catch((err) =>
          console.error("[scheduler] Briefing failed:", err.message)
        );
        generateDailyReview().catch((err) =>
          console.error("[scheduler] Daily review failed:", err.message)
        );
      }

      // 3. 주간 회고: 설정된 요일 + 시간에 실행
      if (currentDay === settings.weeklyReviewDay && currentTime === settings.weeklyReviewTime) {
        generateWeeklyReview().catch((err) =>
          console.error("[scheduler] Weekly review failed:", err.message)
        );
      }
    } catch (err: any) {
      console.error("[scheduler] Tick error:", err.message);
    }
  }

  // 시작 시 1회 체크
  tick();

  // 매 분마다 반복
  setInterval(tick, CHECK_INTERVAL);

  console.log("[scheduler] Notification scheduler started (checks every minute)");
}
