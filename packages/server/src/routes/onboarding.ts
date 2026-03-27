import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
  areas,
  onboardingSessions,
  onboardingMessages,
  areaOnboardingData,
  satisfactionHistory,
} from "../db/schema";
import { getAdapter } from "../adapters";
import type { Message } from "../adapters/types";
import { addXp } from "./xp";
import {
  buildOnboardingSystemPrompt,
  extractStepAnswer,
  getFlowStepCount,
  onboardingFlows,
} from "../prompts/onboarding";

export const onboardingRoutes = new Hono();

// POST /api/onboarding/chat — 온보딩 채팅 (실제 AI 연동)
onboardingRoutes.post("/chat", async (c) => {
  const { areaId, message, sessionId } = await c.req.json<{
    areaId: string;
    message: string;
    sessionId?: string;
  }>();

  if (!areaId || !message) {
    return c.json({ error: "areaId와 message는 필수입니다." }, 400);
  }

  // 1. 세션 조회 또는 생성
  let session: { id: string; areaId: string; status: string | null } | undefined;

  if (sessionId) {
    session = await db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.id, sessionId))
      .get();
  }

  if (!session) {
    // 기존 active 세션 찾기
    session = await db
      .select()
      .from(onboardingSessions)
      .where(and(eq(onboardingSessions.areaId, areaId), eq(onboardingSessions.status, "active")))
      .get();
  }

  if (!session) {
    // 새 세션 생성
    const newId = crypto.randomUUID();
    await db.insert(onboardingSessions).values({
      id: newId,
      areaId,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    session = { id: newId, areaId, status: "active" };
  }

  // 2. 사용자 메시지 저장
  await db.insert(onboardingMessages).values({
    id: crypto.randomUUID(),
    sessionId: session.id,
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  });

  // 3. 이전 대화 히스토리 조회
  const history = await db
    .select()
    .from(onboardingMessages)
    .where(eq(onboardingMessages.sessionId, session.id))
    .orderBy(onboardingMessages.createdAt);

  // 4. 현재 스텝 계산 (assistant 메시지 수 = 완료된 질문 수)
  const assistantCount = history.filter((m) => m.role === "assistant").length;
  const userCount = history.filter((m) => m.role === "user").length;
  const currentStep = Math.min(assistantCount, getFlowStepCount(areaId));

  // 5. 이전 답변에서 수집된 데이터 추출
  const collectedData: Record<string, string> = {};
  const flow = onboardingFlows[areaId];
  if (flow) {
    const userMessages = history.filter((m) => m.role === "user");
    // 첫 메시지는 "시작" 같은 트리거이므로 step 0부터 매핑
    for (let i = 0; i < userMessages.length && i < flow.steps.length; i++) {
      // 첫 유저 메시지(시작 트리거) 이후부터 실제 답변
      if (i === 0 && userCount <= 1) continue;
      const stepIdx = i > 0 ? i - 1 : 0;
      if (stepIdx < flow.steps.length) {
        collectedData[flow.steps[stepIdx]!.key] = extractStepAnswer(
          areaId,
          stepIdx,
          userMessages[i]!.content
        );
      }
    }
  }

  // 6. 시스템 프롬프트 생성
  const systemPrompt = buildOnboardingSystemPrompt(areaId, currentStep, collectedData);

  // 7. AI 호출용 메시지 배열 구성
  const aiMessages: Message[] = history.map((m) => ({
    role: m.role as Message["role"],
    content: m.content,
  }));

  // 8. AI 호출
  let aiResponse: string;
  try {
    const adapter = getAdapter();
    aiResponse = await adapter.chat(aiMessages, systemPrompt);
  } catch (err) {
    console.error("[Onboarding] AI adapter error:", err);
    aiResponse =
      "죄송합니다, AI 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.";
  }

  // 9. AI 응답 저장
  await db.insert(onboardingMessages).values({
    id: crypto.randomUUID(),
    sessionId: session.id,
    role: "assistant",
    content: aiResponse,
    createdAt: new Date().toISOString(),
  });

  // 10. 온보딩 완료 감지
  const isComplete =
    aiResponse.includes("[온보딩 완료]") ||
    currentStep >= getFlowStepCount(areaId);

  let data: Record<string, unknown> = {};

  if (isComplete) {
    // 세션 상태 업데이트
    await db
      .update(onboardingSessions)
      .set({ status: "complete", updatedAt: new Date().toISOString() })
      .where(eq(onboardingSessions.id, session.id));

    // 레벨 추정 (수집 데이터 기반)
    const level = estimateLevel(collectedData);
    const goal = collectedData["goal"] || null;

    // area_onboarding_data 저장
    await db.insert(areaOnboardingData).values({
      id: crypto.randomUUID(),
      areaId,
      level,
      goal,
      customData: JSON.stringify(collectedData),
      completedAt: new Date().toISOString(),
    });

    // area satisfaction 업데이트 (레벨 기반 기본값)
    const satisfaction = Math.min(10, Math.max(1, level * 2 + 2));
    await db
      .update(areas)
      .set({ satisfaction, updatedAt: new Date().toISOString() })
      .where(eq(areas.id, areaId));

    // satisfaction_history 기록
    await db.insert(satisfactionHistory).values({
      id: crypto.randomUUID(),
      areaId,
      score: satisfaction,
      recordedAt: new Date().toISOString(),
      note: "온보딩 완료 시 자동 기록",
    });

    data = { satisfaction, level, goal, collectedData };

    // 온보딩 완료 XP +50, 만족도 기록 XP +5
    try {
      await addXp(areaId, 50, "onboarding_complete");
      await addXp(areaId, 5, "satisfaction_record");
    } catch { /* XP 처리 실패 — 무시 */ }

    // [온보딩 완료] 태그 제거 (사용자에게 보여줄 때)
    aiResponse = aiResponse.replace("[온보딩 완료]", "").trim();
  }

  return c.json({
    message: aiResponse,
    isComplete,
    sessionId: session.id,
    step: currentStep,
    totalSteps: getFlowStepCount(areaId),
    data,
  });
});

// GET /api/onboarding/session/:areaId — 기존 세션 조회
onboardingRoutes.get("/session/:areaId", async (c) => {
  const areaId = c.req.param("areaId");

  const session = await db
    .select()
    .from(onboardingSessions)
    .where(and(eq(onboardingSessions.areaId, areaId), eq(onboardingSessions.status, "active")))
    .get();

  if (!session) {
    return c.json({ session: null, messages: [] });
  }

  const messages = await db
    .select()
    .from(onboardingMessages)
    .where(eq(onboardingMessages.sessionId, session.id))
    .orderBy(onboardingMessages.createdAt);

  return c.json({
    session,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
});

// GET /api/onboarding/data/:areaId — 온보딩 수집 데이터 조회
onboardingRoutes.get("/data/:areaId", async (c) => {
  const areaId = c.req.param("areaId");

  const data = await db
    .select()
    .from(areaOnboardingData)
    .where(eq(areaOnboardingData.areaId, areaId))
    .orderBy(desc(areaOnboardingData.completedAt))
    .get();

  if (!data) {
    return c.json({ data: null });
  }

  return c.json({
    data: {
      ...data,
      customData: data.customData ? JSON.parse(data.customData) : null,
    },
  });
});

// DELETE /api/onboarding/session/:areaId — 세션 리셋 (재온보딩)
onboardingRoutes.delete("/session/:areaId", async (c) => {
  const areaId = c.req.param("areaId");

  // active 세션을 complete로 변경 (삭제하지 않고 보존)
  await db
    .update(onboardingSessions)
    .set({ status: "complete", updatedAt: new Date().toISOString() })
    .where(and(eq(onboardingSessions.areaId, areaId), eq(onboardingSessions.status, "active")));

  return c.json({ ok: true });
});

// ========== 유틸 함수 ==========

function estimateLevel(data: Record<string, string>): number {
  const levelMap: Record<string, number> = {
    // exercise
    "입문 (거의 안 함)": 1,
    "초급 (주 1~2회)": 2,
    "중급 (주 3~4회)": 3,
    "상급 (주 5회 이상)": 4,
    // diet
    "전혀 관리 안 함": 1,
    "간헐적 관리": 2,
    "꾸준히 관리 중": 3,
    "엄격하게 관리 중": 4,
    // finance
    "가끔 확인": 2,
    "월별 예산 설정": 3,
    "매일 기록 중": 4,
  };

  const levelValue = data["level"];
  if (levelValue && levelMap[levelValue]) {
    return levelMap[levelValue];
  }

  return 1; // 기본 레벨
}
