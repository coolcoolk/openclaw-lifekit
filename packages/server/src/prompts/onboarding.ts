// ========== 온보딩 질문 플로우 정의 ==========

export interface FlowStep {
  key: string;
  question: string;
  options?: string[];
}

export interface OnboardingFlow {
  areaId: string;
  areaName: string;
  steps: FlowStep[];
}

export const onboardingFlows: Record<string, OnboardingFlow> = {
  "health-exercise": {
    areaId: "health-exercise",
    areaName: "운동",
    steps: [
      {
        key: "type",
        question: "주로 어떤 운동을 하시나요?",
        options: ["웨이트 트레이닝", "러닝/유산소", "요가/필라테스", "수영", "기타/안 하고 있음"],
      },
      {
        key: "level",
        question: "현재 운동 수준은 어느 정도인가요?",
        options: ["입문 (거의 안 함)", "초급 (주 1~2회)", "중급 (주 3~4회)", "상급 (주 5회 이상)"],
      },
      {
        key: "goal",
        question: "운동 목표는 무엇인가요?",
        options: ["체중 감량", "근력 향상", "체력 유지", "스트레스 해소", "기타"],
      },
      {
        key: "injury",
        question: "현재 부상이나 통증이 있나요?",
        options: ["없음", "허리", "무릎/관절", "어깨", "기타 부위"],
      },
    ],
  },
  "health-mind": {
    areaId: "health-mind",
    areaName: "마음 건강",
    steps: [
      {
        key: "symptoms",
        question: "최근 경험하고 있는 증상이 있나요? (해당하는 것 모두 번호로 알려주세요)",
        options: [
          "수면 문제 (불면/과수면)",
          "불안감/초조함",
          "의욕 저하",
          "집중력 저하",
          "감정 기복",
          "대인관계 어려움",
          "식욕 변화",
          "피로감",
          "해당 없음 (관리 차원)",
        ],
      },
      {
        key: "stressSource",
        question: "주요 스트레스 원인은 무엇인가요?",
        options: ["업무/학업", "대인관계", "재정적 문제", "건강 문제", "특별히 없음"],
      },
    ],
  },
  "health-diet": {
    areaId: "health-diet",
    areaName: "식단/영양",
    steps: [
      {
        key: "level",
        question: "현재 식단 관리 수준은 어떤가요?",
        options: ["전혀 관리 안 함", "간헐적 관리", "꾸준히 관리 중", "엄격하게 관리 중"],
      },
      {
        key: "goal",
        question: "식단 관리의 주요 목표는 무엇인가요?",
        options: ["체중 감량", "근육 증가", "건강 유지", "질병 관리 (당뇨 등)", "기타"],
      },
      {
        key: "calorieTarget",
        question: "일일 칼로리 목표가 있나요?",
        options: ["잘 모르겠음 (추천해주세요)", "1500kcal 이하", "1500~2000kcal", "2000~2500kcal", "2500kcal 이상"],
      },
    ],
  },
  "work-job": {
    areaId: "work-job",
    areaName: "커리어/직장",
    steps: [
      {
        key: "status",
        question: "현재 직업 상태는 어떤가요?",
        options: ["직장인 (정규직)", "프리랜서/자영업", "구직 중", "학생", "기타"],
      },
      {
        key: "detail",
        question: "현재 회사/직무에 대해 간단히 알려주세요. (자유롭게 입력해주세요)",
      },
      {
        key: "goal",
        question: "커리어 목표는 무엇인가요?",
        options: ["승진/성장", "이직", "창업", "워라밸 개선", "스킬 향상"],
      },
    ],
  },
  "finance-spending": {
    areaId: "finance-spending",
    areaName: "지출 관리",
    steps: [
      {
        key: "level",
        question: "현재 지출 관리 수준은 어떤가요?",
        options: ["전혀 관리 안 함", "가끔 확인", "월별 예산 설정", "매일 기록 중"],
      },
      {
        key: "cashflow",
        question: "현재 현금 흐름 상태는 어떤가요?",
        options: ["매달 적자", "거의 0 (수입=지출)", "약간 흑자", "충분히 저축 중"],
      },
      {
        key: "goal",
        question: "재무 목표는 무엇인가요?",
        options: ["지출 줄이기", "저축 늘리기", "투자 시작", "빚 갚기", "재무 자유"],
      },
    ],
  },
};

// ========== 시스템 프롬프트 생성 ==========

export function buildOnboardingSystemPrompt(areaId: string, currentStep: number, collectedData: Record<string, string>): string {
  const flow = onboardingFlows[areaId];

  if (!flow) {
    return buildGenericOnboardingPrompt(areaId);
  }

  const totalSteps = flow.steps.length;
  const isComplete = currentStep >= totalSteps;

  const collectedSummary = Object.entries(collectedData)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  if (isComplete) {
    return `당신은 LifeKit 온보딩 AI 어시스턴트입니다.
사용자가 "${flow.areaName}" 영역의 온보딩을 모두 완료했습니다.

수집된 정보:
${collectedSummary || "(없음)"}

규칙:
- 한국어로 대화하세요.
- 수집된 정보를 요약하고, 앞으로의 관리 방향을 간단히 제안해주세요.
- 응답 마지막에 반드시 "[온보딩 완료]" 태그를 포함하세요.
- 응답은 3~4문장으로 간결하게 해주세요.`;
  }

  const step = flow.steps[currentStep]!;
  const optionText = step.options
    ? step.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")
    : "(자유 입력)";

  return `당신은 LifeKit 온보딩 AI 어시스턴트입니다.
현재 "${flow.areaName}" 영역의 온보딩을 진행 중입니다. (${currentStep + 1}/${totalSteps} 단계)

이전에 수집된 정보:
${collectedSummary || "(아직 없음)"}

지금 물어야 할 질문:
${step.question}

선택지:
${optionText}

규칙:
- 한국어로 대화하세요.
- 질문은 반드시 한 번에 하나만 하세요.
- 위의 질문을 자연스럽게 전달하세요.
- 선택지가 있으면 번호로 선택할 수 있게 안내하세요.
- 사용자가 이전 대화에서 다른 말을 해도, 위 질문으로 자연스럽게 이끌어주세요.
- 응답은 2~3문장으로 간결하게 해주세요.`;
}

function buildGenericOnboardingPrompt(areaId: string): string {
  return `당신은 LifeKit 온보딩 AI 어시스턴트입니다.
사용자가 "${areaId}" 영역의 초기 설정을 하고 있습니다.

규칙:
- 한국어로 대화하세요.
- 질문은 한 번에 하나씩 하세요.
- 해당 영역에서의 현재 상태, 목표, 관리 수준을 파악해주세요.
- 3~4개 질문 후 온보딩을 완료하고, 마지막에 "[온보딩 완료]" 태그를 포함하세요.
- 선택지를 번호로 제공하세요 (1~5개).
- 응답은 2~3문장으로 간결하게 해주세요.`;
}

// ========== 유틸: 사용자 응답에서 데이터 추출 ==========

export function extractStepAnswer(areaId: string, stepIndex: number, userMessage: string): string {
  const flow = onboardingFlows[areaId];
  if (!flow || stepIndex >= flow.steps.length) return userMessage;

  const step = flow.steps[stepIndex]!;

  if (!step.options) return userMessage.trim();

  // 번호 선택 파싱 (예: "1", "3번", "1, 3")
  const numberMatch = userMessage.match(/(\d+)/g);
  if (numberMatch) {
    const selected = numberMatch
      .map((n) => parseInt(n) - 1)
      .filter((i) => i >= 0 && i < step.options!.length)
      .map((i) => step.options![i]);

    if (selected.length > 0) return selected.join(", ");
  }

  return userMessage.trim();
}

export function getFlowStepCount(areaId: string): number {
  return onboardingFlows[areaId]?.steps.length ?? 4;
}
