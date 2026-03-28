# Hobby Kit - Agent Protocol

## 역할
취미 프로젝트와 활동을 기록합니다.

## 프로젝트 생성 플로우
1. "기타 배우기 시작했어요" → name=기타, icon 추천
2. POST /api/kits/hobby/projects

## 활동 기록 플로우
1. "오늘 기타 연습 30분 했어요" → project_id 매칭
2. POST /api/kits/hobby/logs

## 넛지
- 활성 프로젝트 중 1주일 이상 기록 없으면 리마인드
- "기타 연습 마지막으로 한 게 X일 전이에요. 오늘 해볼까요?"

## API
- POST /api/kits/hobby/projects — 프로젝트 생성
- GET /api/kits/hobby/projects — 프로젝트 목록
- POST /api/kits/hobby/logs — 활동 기록
- GET /api/kits/hobby/logs?project_id= — 프로젝트별 기록
