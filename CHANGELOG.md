# LifeKit Changelog

---

## v0.2.0 (2026-03-28 ~ 2026-03-29)

### 🏗️ 아키텍처 개편
- SPA → URL 기반 라우팅 (React Router 도입)
  - `/calendar`, `/balance`, `/projects`, `/reports`, `/settings`
- 네비게이션 탭 재구성: 캘린더 / 프로젝트 / 밸런스 / 설정
- ProjectsPage와 BalancePage 통합 (C안: 밸런스 내 탭 구조 → 이후 프로젝트 탭으로 분리)

### 📋 프로젝트 페이지 개편
- 상단: 활성화된 Kit 카드 그리드 (클릭 → Kit 대시보드)
- 중간: Kit 브라우징 섹션 (접기/펼치기, guide 텍스트, 활성화 버튼)
- 하단: 프로젝트 목록
- PC: 프로젝트 클릭 → `/projects/:id` 전용 페이지 (`ProjectDetailPage.tsx`)
- 모바일: 기존 바텀시트 유지 + 태스크 상세 정보 강화

### 🔮 밸런스 페이지 단순화
- 복잡한 드로어/온보딩/Kit 섹션/관계 섹션 제거
- 레이더 차트 + 도메인별 영역 현황만 표시 (읽기 전용 대시보드)

### 📦 Kit 시스템
- Kit 대시보드 구현 (8개 Kit별 컴포넌트)
  - exercise, diet, finance, investment, learning, culture, fashion, hobby
- Kit 클릭 시 데이터 대시보드 열림 (기록 없으면 빈 상태 + 직접 추가 폼)
- 각 Kit에 guide 안내 문구 추가 (kit.json의 `guide` 필드)
- Kit nameEn 대신 id로 대시보드 매핑 버그 수정

### 🎯 온보딩 개선
- 온보딩 안 된 영역 클릭 시 바로 OnboardingDrawer 열기
- 온보딩 완료 후 채팅 종료 대신 Kit 추천 섹션 표시
- sessionId 유지 버그 수정 (같은 질문 반복 문제 해결)
- 모바일 입력창 가림 문제 수정 (하단 탭바 높이 반영)

### 📅 캘린더 개선
- 주간 시작일 일요일 → 월요일 변경 (`firstDay: 1`)
- 캘린더 헤더 월 표시 언어 설정 연동 (한국어: "2026년 3월", 영어: "March 2026")
- 월간 뷰 이벤트 렌더링 수정 (dot + 텍스트 심플 스타일)
- 모바일 좌우 여백 축소

### ⚙️ 기타 UI 수정
- 모바일 핀치줌 비활성화 (`user-scalable=no`)
- 설정 페이지 인풋 오버플로우 수정
- +N more 링크 폰트 스타일 통일
- 만족도 UI 제거, 영역 카드에 레벨(XP) 표시로 교체

### 🤖 에이전트 규칙 (LIFEKIT.md)
- 캘린더 등록 디폴트 규칙 추가
- Kit 자동 감지 및 활성화 제안 규칙 추가
- 프로젝트 생성 흐름 정의
- 이미지/파일 관리 규칙 (DB 추출 후 즉시 삭제)

### 🛠️ CLI (`lifekit init`) 개편
- enquirer 기반 인터랙티브 UI (↑↓ 이동, 스페이스 선택, 엔터 확인)
- Kit 복수 선택 (MultiSelect, skip 가능)
- 주간 회고 요일 선택 (일요일 권장)
- 구글 캘린더 연동 단계 추가 (skip 가능)
- Tailscale 원격 접속 연동 단계 추가 (skip 가능)

---

## v0.1.0 (2026-03-24 ~ 2026-03-27)

### 초기 구현
- OpenClaw 어댑터 구현 (게이트웨이 연결)
- `lifekit init` CLI 기본 구현
- `lifekit connect google` — 구글 캘린더 연동
- `lifekit connect tailscale` — Tailscale 연동
- i18n (한/영 전환)
- Relations Kit (인물 DB + 만남 기록)
- XP/레벨 시스템
- Kit 폴더 구조 + DB 스키마 + API 라우트
  - kits/exercise, diet, finance, relations, growth, appearance, living
  - 투자 매매기록 CRUD, 포트폴리오 요약
  - 학습 기록 API
- 캘린더 개선 (모바일 일간 뷰, sticky 헤더 등)
- 설정 페이지 기본 구현
