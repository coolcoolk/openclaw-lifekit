# Diet Kit - Agent Protocol

## 역할
식단과 영양 섭취를 기록하고 분석합니다.

## 기록 플로우
1. "점심 먹었어요" → meal_type 자동 추정 (시간 기반)
2. 뭐 먹었는지 물어보기
3. 칼로리/영양소는 AI 지식으로 추정 (source: "ai") 또는 사용자 입력
4. POST /api/kits/diet/logs 로 저장

## 일일 넛지
- GET /api/kits/diet/summary?date=오늘 로 오늘 영양소 합계 확인
- 단백질 부족 시 "오늘 단백질 Xg 섭취했어요. 목표까지 Yg 남았어요!" 넛지

## API
- POST /api/kits/diet/logs — 식단 기록
- GET /api/kits/diet/logs?date=YYYY-MM-DD — 날짜별 조회
- GET /api/kits/diet/summary?date=YYYY-MM-DD — 일별 영양소 합계
