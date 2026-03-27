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
  "health-mental": {
    areaId: "health-mental",
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
  "work-business": {
    areaId: "work-business",
    areaName: "사업",
    steps: [
      {
        key: "stage",
        question: "현재 사업 단계는 어디인가요?",
        options: ["아이디어 단계", "준비 중", "초기 운영 (1년 미만)", "운영 중 (1년 이상)", "확장/스케일업"],
      },
      {
        key: "industry",
        question: "업종은 무엇인가요? (자유롭게 입력해주세요)",
      },
      {
        key: "revenueGoal",
        question: "월 매출 목표는 어느 정도인가요?",
        options: ["아직 매출 없음", "100만원 미만", "100~500만원", "500~1000만원", "1000만원 이상"],
      },
      {
        key: "challenge",
        question: "현재 가장 큰 애로사항은 무엇인가요?",
        options: ["자금/투자", "고객 확보", "팀 구성", "제품/서비스 개선", "워라밸"],
      },
    ],
  },
  "work-side": {
    areaId: "work-side",
    areaName: "부업",
    steps: [
      {
        key: "type",
        question: "어떤 유형의 부업을 하고 있거나 관심 있나요?",
        options: ["프리랜서", "콘텐츠 크리에이터", "투자 (주식/코인 등)", "온라인 판매", "기타"],
      },
      {
        key: "incomeGoal",
        question: "부업으로 월 수입 목표는 얼마인가요?",
        options: ["아직 수입 없음", "30만원 미만", "30~100만원", "100~300만원", "300만원 이상"],
      },
      {
        key: "timeInvest",
        question: "부업에 투자 가능한 시간은 주당 어느 정도인가요?",
        options: ["주 5시간 미만", "주 5~10시간", "주 10~20시간", "주 20시간 이상"],
      },
    ],
  },
  "finance-invest": {
    areaId: "finance-invest",
    areaName: "투자",
    steps: [
      {
        key: "assetType",
        question: "주로 투자하는(관심 있는) 자산은 무엇인가요?",
        options: ["주식", "부동산", "코인/가상자산", "펀드/ETF", "아직 투자 안 함"],
      },
      {
        key: "experience",
        question: "투자 경력은 어느 정도인가요?",
        options: ["입문 (1년 미만)", "초급 (1~3년)", "중급 (3~5년)", "상급 (5년 이상)"],
      },
      {
        key: "returnGoal",
        question: "목표 연 수익률은 어느 정도인가요?",
        options: ["안정적 (5% 이하)", "보통 (5~15%)", "공격적 (15~30%)", "매우 공격적 (30% 이상)", "잘 모르겠음"],
      },
    ],
  },
  "rel-lover": {
    areaId: "rel-lover",
    areaName: "연인",
    steps: [
      {
        key: "status",
        question: "현재 연애 상태는 어떤가요?",
        options: ["솔로", "썸/시작 단계", "연애 중", "동거 중", "결혼/약혼"],
      },
      {
        key: "goal",
        question: "연인 관계에서의 목표는 무엇인가요?",
        options: ["새로운 만남", "관계 유지/발전", "갈등 해결", "결혼 준비", "특별히 없음"],
      },
    ],
  },
  "rel-friends": {
    areaId: "rel-friends",
    areaName: "친구",
    steps: [
      {
        key: "closeFriends",
        question: "가까운 친구가 몇 명 정도 있나요?",
        options: ["거의 없음", "1~2명", "3~5명", "5명 이상"],
      },
      {
        key: "frequency",
        question: "친구들과 얼마나 자주 만나나요?",
        options: ["거의 안 만남", "월 1~2회", "주 1회", "주 2회 이상"],
      },
      {
        key: "goal",
        question: "친구 관계에서의 목표는 무엇인가요?",
        options: ["새로운 친구 만들기", "기존 관계 유지", "더 깊은 우정", "네트워킹 확장", "특별히 없음"],
      },
    ],
  },
  "rel-family": {
    areaId: "rel-family",
    areaName: "가족",
    steps: [
      {
        key: "contactFreq",
        question: "가족과 얼마나 자주 연락하나요?",
        options: ["거의 안 함", "월 1~2회", "주 1회", "주 2회 이상", "같이 살고 있음"],
      },
      {
        key: "goal",
        question: "가족 관계에서의 목표는 무엇인가요?",
        options: ["연락 더 자주 하기", "관계 개선", "가족 행사 챙기기", "효도/돌봄", "특별히 없음"],
      },
    ],
  },
  "rel-pet": {
    areaId: "rel-pet",
    areaName: "반려동물",
    steps: [
      {
        key: "hasPet",
        question: "현재 반려동물이 있나요?",
        options: ["있음", "없지만 계획 중", "없음"],
      },
      {
        key: "petType",
        question: "반려동물 종류는 무엇인가요? (있거나 계획 중이라면)",
        options: ["강아지", "고양이", "물고기/파충류", "새/소동물", "기타"],
      },
    ],
  },
  "growth-self": {
    areaId: "growth-self",
    areaName: "자기계발",
    steps: [
      {
        key: "current",
        question: "현재 하고 있는 자기계발이 있나요?",
        options: ["독서", "온라인 강의", "자격증 준비", "외국어 공부", "안 하고 있음"],
      },
      {
        key: "goal",
        question: "자기계발 목표는 무엇인가요?",
        options: ["새로운 스킬 습득", "전문성 강화", "자격증 취득", "습관 만들기", "기타"],
      },
    ],
  },
  "growth-culture": {
    areaId: "growth-culture",
    areaName: "문화생활",
    steps: [
      {
        key: "type",
        question: "주로 즐기는 문화생활은 무엇인가요?",
        options: ["영화/드라마", "공연/뮤지컬", "전시/미술관", "음악/콘서트", "기타/안 즐김"],
      },
      {
        key: "frequency",
        question: "문화생활 빈도는 어느 정도인가요?",
        options: ["거의 안 함", "월 1~2회", "주 1회", "주 2회 이상"],
      },
    ],
  },
  "growth-hobby": {
    areaId: "growth-hobby",
    areaName: "취미활동",
    steps: [
      {
        key: "hobby",
        question: "현재 즐기는 취미가 있나요? (자유롭게 입력해주세요)",
      },
      {
        key: "timeInvest",
        question: "취미에 투자하는 시간은 주당 어느 정도인가요?",
        options: ["거의 없음", "주 2시간 미만", "주 2~5시간", "주 5~10시간", "주 10시간 이상"],
      },
    ],
  },
  "growth-travel": {
    areaId: "growth-travel",
    areaName: "여행",
    steps: [
      {
        key: "frequency",
        question: "여행을 얼마나 자주 가나요?",
        options: ["거의 안 감", "연 1~2회", "분기 1회", "월 1회 이상"],
      },
      {
        key: "style",
        question: "선호하는 여행 스타일은 무엇인가요?",
        options: ["휴양/힐링", "탐험/모험", "문화/역사", "미식 여행", "워케이션"],
      },
    ],
  },
  "appear-fashion": {
    areaId: "appear-fashion",
    areaName: "패션",
    steps: [
      {
        key: "interest",
        question: "패션에 대한 관심도는 어느 정도인가요?",
        options: ["1 (관심 없음)", "2 (최소한만)", "3 (보통)", "4 (꽤 신경 씀)", "5 (매우 중요)"],
      },
      {
        key: "goal",
        question: "패션 관련 목표가 있다면 무엇인가요?",
        options: ["나만의 스타일 찾기", "옷장 정리/미니멀", "트렌드 따라가기", "특별한 목표 없음"],
      },
    ],
  },
  "appear-skincare": {
    areaId: "appear-skincare",
    areaName: "스킨케어/위생",
    steps: [
      {
        key: "routine",
        question: "현재 스킨케어 루틴이 어떤가요?",
        options: ["없음 (세안만)", "기초 (세안+로션)", "중급 (세럼/자외선차단 포함)", "풀 루틴 관리 중"],
      },
      {
        key: "concern",
        question: "피부/외모 관련 가장 큰 고민은 무엇인가요?",
        options: ["트러블/여드름", "건조함", "노화/주름", "모공/피지", "특별한 고민 없음"],
      },
    ],
  },
  "living-housework": {
    areaId: "living-housework",
    areaName: "가사",
    steps: [
      {
        key: "livingType",
        question: "현재 동거 형태는 어떤가요?",
        options: ["혼자 살고 있음", "가족과 함께", "룸메이트/동거인", "기숙사"],
      },
      {
        key: "challenge",
        question: "가사 관련 가장 큰 고민은 무엇인가요?",
        options: ["청소/정리", "요리/식사 준비", "빨래", "가사 분담 갈등", "시간 부족"],
      },
    ],
  },
  "living-admin": {
    areaId: "living-admin",
    areaName: "생활관리",
    steps: [
      {
        key: "wellManaged",
        question: "현재 잘 관리되고 있는 것은 무엇인가요? (복수 선택 가능)",
        options: ["공과금/세금", "보험/연금", "구독 서비스", "서류/우편물", "전부 다 잘 관리됨"],
      },
      {
        key: "needsWork",
        question: "관리가 잘 안 되는 것은 무엇인가요? (복수 선택 가능)",
        options: ["공과금/세금", "보험/연금", "구독 서비스", "서류/우편물", "전부 문제없음"],
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
