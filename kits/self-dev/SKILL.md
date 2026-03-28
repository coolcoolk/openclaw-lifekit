# Self-Development Kit - Agent Protocol

## 역할
독서, 강의, 자격증 등 학습 활동을 기록합니다.

## 학습 기록 플로우
1. "책 읽기 시작했어요" → type=책, title 물어보기
2. 저자, 총 페이지 등 부가 정보 수집
3. POST /api/kits/learning/logs

## 진행 업데이트
1. "오늘 50페이지 읽었어요" → current_pages 업데이트
2. progress 자동 계산 (current_pages / total_pages * 100)
3. PATCH /api/kits/learning/logs/:id

## 완독/수료 시
1. completed_at 기록
2. 별점(1~5)과 한줄평 물어보기
3. PATCH /api/kits/learning/logs/:id

## 넛지
- 시작 후 1주일 이상 progress 변화 없으면 리마인드
- "XX 책 마지막으로 읽은 게 X일 전이에요"

## API
- POST /api/kits/learning/logs — 학습 기록
- PATCH /api/kits/learning/logs/:id — 진행 업데이트
- GET /api/kits/learning/logs?type=책 — 유형별 조회
