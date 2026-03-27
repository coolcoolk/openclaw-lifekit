# OpenClaw LifeKit — 기획서 v0.2

> OpenClaw 에이전트의 비서력을 극대화하는 로컬 데이터 인프라 + 스킬 생태계

---

## 1. 문제 정의

### 현재 상황
- OpenClaw 에이전트는 똑똑하지만 **구조화된 기억이 없다**
- 사용자 데이터가 Notion, Google Calendar, 메모앱 등에 **산재**
- 에이전트가 매번 API로 외부 서비스를 긁어와야 함 → 느리고, 불안정하고, 형식이 제각각
- 에이전트의 비서 역할이 **도구의 한계**에 갇힘

### 핵심 인사이트
> 에이전트에게 "행동"을 가르치는 건 스킬이 한다.
> 에이전트에게 "기억"을 주는 건 아무것도 없다.

LifeKit = 에이전트의 **구조화된 장기 기억** + 그걸 활용하는 **스킬 번들**

---

## 2. 제품 비전

### 한 줄 요약
**"내 인생을 체계적으로 관리하는 로컬 DB + 대시보드 + AI 스킬 시스템"**

### 핵심 가치
1. **구조화** — 흩어진 정보를 계층적 DB로 정리
2. **자동화** — 에이전트가 DB를 읽고 써서 리포트/알림/분석 자동 수행
3. **보안** — 로컬 호스팅, 데이터가 내 기기를 안 떠남
4. **확장** — 스킬(md) 설치로 모듈 추가, 마켓 플레이스 가능

### 작동 흐름
```
사용자 → 대시보드(웹) → 태스크/일정/프로젝트 관리
                ↕
          로컬 DB (SQLite)
                ↕
       OpenClaw 에이전트 → 리포트, 알림, 분석, 자동화
                ↕
         스킬 (md 파일) → 모듈별 기능 정의
```

---

## 3. 분류 체계 (확정)

### 4단 계층: Domain → Area → Project → Task

| Domain | Area | 설명 |
|--------|------|------|
| 🏥 **건강** | 운동/신체 | 헬스, 러닝, 재활, 체중 관리 |
| | 정신/마음 | 명상, 수면, 스트레스 관리, 번아웃 |
| | 식습관 | 식단, 영양, 식비 관리 |
| 💼 **일** | 직장 | 업무, 인사평가, 이직, 스킬업 |
| | 사업 | 매출, 고객, 제품 개발, 법인 관리 |
| | 부업 | 수익화, 프리랜서, 블로그, 과외 |
| 💰 **재무** | 소비/저축 | 가계부, 비상금, 소비 패턴 |
| | 투자 | 주식, 부동산, 청약, 연금 |
| 💕 **관계** | 연인 | 데이트, 기념일, 관계 관리 |
| | 친구 | 모임, 약속, 네트워킹 |
| | 가족 | 부모님, 형제, 명절, 경조사 |
| | 반려동물 | 반려동물 건강, 용품, 일상 |
| 🌱 **성장/여가** | 자기계발 | 학습, 독서, 자격증, 언어 |
| | 문화생활 | 전시, 공연, 영화, 카페 |
| | 취미활동 | 음악, 운동취미, 게임, 요리 |
| | 여행 | 국내/해외 여행, 주말 나들이 |
| 👔 **외모** | 패션 | 옷, 쇼핑, 계절 옷장 정리 |
| | 스킨케어/위생 | 피부 관리, 미용실, 위생 루틴 |
| 🏠 **생활** | 가사 | 청소, 빨래, 요리, 정리정돈 |
| | 생활관리 | 보험, 세금, 공과금, 이사, 계약 |

**7도메인 18영역**

### 유연성 규칙
- Task는 Project 없이 Area에 직접 속할 수 있음
- Task는 Area 없이도 존재 가능 (미분류)
- Project는 Area 없이도 존재 가능
- Area는 유저가 커스텀 추가/삭제 가능
- Domain은 시스템 기본값 + 유저 커스텀 가능

### MECE 검증 (26세 사회초년생 시나리오)
- ✅ 이직 준비 → 일/직장
- ✅ 운전면허 → 성장/자기계발
- ✅ 보험 가입 → 생활/생활관리
- ✅ 주택청약 납입 → 재무/투자 (당첨 후 입주 → 생활/생활관리)
- ✅ 영어 공부 → 목적에 따라 일/직장 or 성장/자기계발

### PARA / Wheel of Life 반영
- **Archive** → 프로젝트 상태값에 `완료`/`보관` 포함 (별도 레이어 아님)
- **Resources** → 영역/프로젝트별 노트/메모 기능 (자연스럽게 내장)
- **Wheel of Life** → 영역별 만족도 + 레이더 차트 대시보드 위젯

---

## 4. 아키텍처

### 시스템 구조
```
OpenClaw LifeKit
├── Core (코어) ─────────── 항상 포함
│   ├── DB 엔진 (SQLite)
│   ├── 웹 대시보드 서버
│   ├── API 레이어
│   └── OpenClaw 스킬 인터페이스
│
├── Base Module (기본 모듈) ── v1.0
│   ├── Domain / Area 관리
│   ├── 프로젝트 (Projects)
│   ├── 태스크 (Tasks)
│   ├── 캘린더 (Calendar + Google 동기화)
│   └── 리포트 (일일/주간)
│
└── Extension Modules (확장) ── v2.0+
    ├── 💰 가계부 / 재무
    ├── 💪 운동 / 건강
    ├── 👥 인간관계
    ├── 📔 저널 / 일기
    └── ... (무한 확장)
```

### 기술 스택 (확정)
| 구성요소 | 선택 | 이유 |
|---------|------|------|
| DB | **SQLite** | 로컬 호스팅 최적, 설치 zero, 백업 = 파일 복사 |
| 웹 서버 | **Bun + Hono** | 가볍고 빠름, SQLite 네이티브 지원 |
| 프론트엔드 | **React + Vite + Shadcn/ui** | SSR 불필요, 가볍고 빠름 |
| 캘린더 | **FullCalendar** (무료) | 검증된 캘린더 UI, 유료 기능은 필요시 직접 구현 |
| ORM | **Drizzle** | SQLite 친화, 타입 세이프 |
| 패키징 | **npm 패키지 + Docker** | 최대 접근성 |

### 왜 SQLite?
- **로컬 퍼스트** — 서버 불필요, `data.db` 파일 하나
- **백업** — 파일 복사 or Litestream으로 S3 동기화
- **보안** — 네트워크에 노출 안 됨
- **성능** — 개인용으로 충분히 빠름
- **이식성** — 어디든 옮기기 쉬움

---

## 5. 데이터 모델

### 5.1 도메인 (Domains)
```sql
CREATE TABLE domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,  -- 시스템 기본값 여부
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 영역 (Areas)
```sql
CREATE TABLE areas (
    id TEXT PRIMARY KEY,
    domain_id TEXT REFERENCES domains(id),
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    satisfaction INTEGER,  -- 1~10 만족도 (Wheel of Life)
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 프로젝트 (Projects)
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),  -- nullable
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',  -- active/paused/completed/archived
    target_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.4 태스크 (Tasks)
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),  -- nullable
    area_id TEXT REFERENCES areas(id),        -- nullable (프로젝트 없는 태스크용)
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',  -- todo/in_progress/done/cancelled
    priority TEXT DEFAULT 'P2',  -- P1/P2/P3
    due_date DATETIME,
    completed_at DATETIME,
    is_routine BOOLEAN DEFAULT FALSE,
    routine_rule TEXT,           -- RRULE (반복 규칙)
    tags TEXT,                   -- JSON array
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.5 캘린더 이벤트 (Calendar Events)
```sql
CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_at DATETIME NOT NULL,
    end_at DATETIME,
    all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    source TEXT DEFAULT 'manual',  -- manual/google/apple
    external_id TEXT,              -- google_event_id 등
    linked_task_id TEXT REFERENCES tasks(id),
    linked_project_id TEXT REFERENCES projects(id),
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.6 노트 (Notes — Resources 개념)
```sql
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),
    project_id TEXT REFERENCES projects(id),
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.7 구글 캘린더 동기화
```sql
CREATE TABLE sync_state (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    last_sync_at DATETIME,
    sync_token TEXT,
    config TEXT,  -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.8 만족도 히스토리 (Wheel of Life)
```sql
CREATE TABLE satisfaction_history (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),
    score INTEGER NOT NULL,  -- 1~10
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);
```

---

## 6. 스킬 시스템

### 스킬 = md 파일 + 스키마 + 대시보드 위젯

```
skills/
└── finance/
    ├── SKILL.md          ← 에이전트 행동 정의
    ├── schema.sql        ← DB 테이블 마이그레이션
    ├── widgets/          ← 대시보드 위젯 컴포넌트
    └── config.json       ← 설정 (이름, 버전, 의존성)
```

### 설치 흐름
```bash
openclaw skill install lifekit/finance
# 1. schema.sql → DB에 테이블 추가
# 2. SKILL.md → 에이전트 인식
# 3. widgets/ → 대시보드 위젯 추가
```

### 수익화
| 티어 | 포함 | 가격 |
|------|------|------|
| Core | 태스크/캘린더/리포트 | 무료 (오픈소스) |
| Pro Skills | 재무분석, 건강대시보드, 관계맵 등 | ₩4,900/월 or 개별 구매 |
| Marketplace | 커뮤니티/3rd party 스킬 | 판매자 수수료 |

---

## 7. 대시보드 UI

### 메인 레이아웃
```
┌──────────────────────────────────────────────┐
│  🧰 LifeKit              [검색] [설정] [👤]  │
├────────┬─────────────────────────────────────┤
│        │                                     │
│  📋    │   오늘                    2026.3.18  │
│ 태스크  │   ┌─────────────────────────────┐   │
│        │   │ ☐ 취업 준비        P1  14:00 │   │
│  📅    │   │ ☐ 운동프로그램 점검  P1  13:00 │   │
│ 캘린더  │   │ ✅ 말해보카        P1  완료   │   │
│        │   └─────────────────────────────┘   │
│  📊    │                                     │
│ 리포트  │   📅 오늘 일정                       │
│        │   ┌─────────────────────────────┐   │
│  🎯    │   │ 19:00 재즈방 미팅 (비즈니스)  │   │
│ 프로젝트 │   └─────────────────────────────┘   │
│        │                                     │
│  🔮    │   🔮 영역 밸런스 (레이더 차트)       │
│ 밸런스  │   건강 ████████░░ 8                  │
│        │   일   ██████░░░░ 6                  │
│  ⚙️    │   재무 ████░░░░░░ 4                  │
│ 설정    │                                     │
├────────┴─────────────────────────────────────┤
│  Powered by OpenClaw                         │
└──────────────────────────────────────────────┘
```

### 캘린더 뷰
- 월간/주간/일간 전환
- 구글 캘린더 이벤트 = 파란색
- 로컬 태스크 = 회색
- 드래그 앤 드롭으로 일정 변경

---

## 8. 구글 캘린더 연동

### 동기화 전략
- **양방향 동기화** (로컬 ↔ 구글)
- 증분 동기화 (sync token)
- 충돌 해결: 마지막 수정 시간 기준
- 동기화 주기: 대시보드 접속 시 + 수동 트리거 + 에이전트 크론

---

## 9. 에이전트 연동 (OpenClaw)

### 현재 vs LifeKit 이후
| 기능 | 현재 (Notion API) | LifeKit |
|------|------------------|---------|
| 태스크 조회 | 느림, 형식 불안정 | 로컬 DB 즉시 조회 |
| 리포트 | 매번 API 호출 | 로컬 쿼리, 빠르고 안정 |
| 캘린더 | gws CLI 별도 호출 | 통합 DB에서 한번에 |
| 데이터 분석 | 제한적 | SQL로 무한 가능 |
| 새 모듈 추가 | 하드코딩 | 스킬 설치 한 줄 |

---

## 10. 개발 로드맵

### Phase 1 — MVP (2~3주)
- [ ] 프로젝트 셋업 (monorepo: server + web)
- [ ] SQLite DB + Drizzle ORM + 시드 데이터 (7도메인 18영역)
- [ ] Domain/Area/Project/Task CRUD API
- [ ] 캘린더 이벤트 CRUD API
- [ ] 대시보드 웹 UI (태스크 리스트 + 캘린더 뷰 + 레이더 차트)
- [ ] 구글 캘린더 양방향 동기화
- [ ] OpenClaw 스킬 (SKILL.md) — 리포트 + 태스크 관리
- [ ] Notion → LifeKit 데이터 마이그레이션 스크립트

### Phase 2 — 안정화 (2주)
- [ ] 대시보드 UI 다듬기 (필터, 정렬, 검색)
- [ ] 리포트 템플릿 커스터마이징
- [ ] 반복 태스크 (RRULE)
- [ ] 모바일 반응형
- [ ] 만족도 기록 + 레이더 차트 히스토리

### Phase 3 — 확장 (이후)
- [ ] 스킬 시스템 프레임워크
- [ ] 가계부 스킬
- [ ] 운동 스킬
- [ ] 인간관계 스킬
- [ ] 스킬 마켓플레이스
- [ ] 설치 CLI (`openclaw lifekit init`)

---

## 11. Notion 마이그레이션 계획

### 소스 DB
| Notion DB | LifeKit 대상 |
|-----------|-------------|
| 관리 영역 (`1cd0d222...`) | domains + areas |
| Project (`7534fb66...`) | projects |
| Tasks (`b19ede9c...`) | tasks |
| 약속 (`1790d222...`) | calendar_events |

### 매핑
- Notion "Domain" select → LifeKit domains 테이블
- Notion "영역이름" title → LifeKit areas 테이블
- Notion Project → LifeKit projects (상태값 매핑 필요)
- Notion Tasks → LifeKit tasks (완료 checkbox → status)

---

*작성: 2026-03-18 | 작성자: 아그 | 버전: 0.2*
*변경: v0.1 → v0.2 — 이름 확정(LifeKit), 분류 체계 확정(7도메인 18영역), MECE 검증, PARA/WoL 반영*
