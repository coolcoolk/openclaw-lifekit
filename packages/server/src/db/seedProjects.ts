import { db, sqlite } from "./index";
import { domains, areas, projects, tasks } from "./schema";
import { randomUUIDv7 } from "bun";

const now = new Date().toISOString();

// 추가 도메인 (기존 seed에 없는 것)
const EXTRA_DOMAINS = [
  { id: "life", name: "생활", icon: "🏡", color: "#f59e0b", sortOrder: 8, isSystem: true },
  { id: "taste", name: "취향", icon: "🎨", color: "#e11d48", sortOrder: 9, isSystem: true },
];

const EXTRA_AREAS = [
  { id: "life-general", domainId: "life", name: "일반", icon: "📦", sortOrder: 1 },
  { id: "taste-general", domainId: "taste", name: "일반", icon: "🎭", sortOrder: 1 },
];

// 프로젝트 mock 데이터
const PROJECTS = [
  {
    id: "proj-pilates",
    areaId: "work-business",
    name: "남성 필라테스 사업",
    description: "남성 대상 필라테스 사업 기획 및 런칭",
    status: "active",
    tasks: [
      { title: "시장 조사 및 경쟁사 분석", status: "done", isRoutine: false },
      { title: "사업계획서 초안 작성", status: "in_progress", isRoutine: false },
      { title: "공간 임대 후보지 리스트업", status: "todo", isRoutine: false },
    ],
  },
  {
    id: "proj-job-prep",
    areaId: "work-job",
    name: "취업을 위한 재료들",
    description: "이력서, 포트폴리오, 자기소개서 준비",
    status: "completed",
    tasks: [
      { title: "이력서 최종 업데이트", status: "done", isRoutine: false },
      { title: "포트폴리오 사이트 배포", status: "done", isRoutine: false },
      { title: "면접 준비 질문 리스트", status: "done", isRoutine: false },
    ],
  },
  {
    id: "proj-networking",
    areaId: "work-job",
    name: "직무&사업가 네트워킹",
    description: "직무 관련 네트워킹 및 사업가 커뮤니티 참여",
    status: "backlog",
    tasks: [
      { title: "LinkedIn 프로필 업데이트", status: "todo", isRoutine: false },
      { title: "월간 네트워킹 모임 참석", status: "todo", isRoutine: false },
    ],
  },
  {
    id: "proj-notion-tpl",
    areaId: "work-side",
    name: "노션 템플릿 만들기",
    description: "판매용 노션 템플릿 제작",
    status: "paused",
    tasks: [
      { title: "템플릿 컨셉 기획", status: "done", isRoutine: false },
      { title: "디자인 시스템 구성", status: "todo", isRoutine: false },
      { title: "마켓플레이스 등록", status: "todo", isRoutine: false },
    ],
  },
  {
    id: "proj-shopping",
    areaId: "life-general",
    name: "살것 목록",
    description: "필요한 물품 구매 관리",
    status: "active",
    tasks: [
      { title: "이번 주 장보기 목록 확인", status: "todo", isRoutine: true },
      { title: "생활용품 재고 체크", status: "todo", isRoutine: true },
    ],
  },
  {
    id: "proj-finance-note",
    areaId: "finance-spending",
    name: "가계부&투자노트 작성",
    description: "주간 가계부 정리 및 투자 기록",
    status: "active",
    tasks: [
      { title: "주간 지출 기록 정리", status: "todo", isRoutine: true },
      { title: "투자 포트폴리오 리뷰", status: "todo", isRoutine: true },
      { title: "월 예산 대비 지출 확인", status: "todo", isRoutine: true },
    ],
  },
  {
    id: "proj-exercise",
    areaId: "health-exercise",
    name: "주 3회 이상 꾸준 헬스/운동",
    description: "꾸준한 운동 습관 유지",
    status: "active",
    tasks: [
      { title: "오늘 운동 루틴 수행", status: "todo", isRoutine: true },
      { title: "운동 기록 작성", status: "todo", isRoutine: true },
    ],
  },
  {
    id: "proj-concert",
    areaId: "taste-general",
    name: "2505 공연 준비",
    description: "2025년 5월 공연 관련 준비",
    status: "completed",
    tasks: [
      { title: "티켓 예매 완료", status: "done", isRoutine: false },
      { title: "교통편 및 숙소 예약", status: "done", isRoutine: false },
    ],
  },
];

export async function seedProjects() {
  // 이미 프로젝트가 있으면 스킵
  const existing = db.select().from(projects).all();
  if (existing.length > 0) {
    console.log("  ⏭️  프로젝트 시드 스킵 (이미 데이터 존재)");
    return;
  }

  console.log("🌱 프로젝트 시드 삽입 중...");

  // 추가 도메인 삽입
  for (const domain of EXTRA_DOMAINS) {
    db.insert(domains).values(domain).onConflictDoNothing().run();
  }

  // 추가 영역 삽입
  for (const area of EXTRA_AREAS) {
    db.insert(areas).values(area).onConflictDoNothing().run();
  }

  // 프로젝트 + 태스크 삽입
  for (const proj of PROJECTS) {
    db.insert(projects)
      .values({
        id: proj.id,
        areaId: proj.areaId,
        name: proj.name,
        description: proj.description,
        status: proj.status,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    for (const task of proj.tasks) {
      db.insert(tasks)
        .values({
          id: randomUUIDv7(),
          projectId: proj.id,
          areaId: proj.areaId,
          title: task.title,
          status: task.status,
          isRoutine: task.isRoutine,
          completedAt: task.status === "done" ? now : null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  }

  console.log(`  ✅ ${PROJECTS.length}개 프로젝트 + 태스크 시드 완료`);
}
