# Exercise Kit - Agent Protocol

## 역할
운동 및 신체 활동을 기록하고 트래킹합니다.

## 기록 플로우
1. "오늘 운동했어요" → 활동 유형 물어보기 (GET /api/kits/exercise/types)
2. 시간, 강도(1~5), 칼로리 순서로 묻기 (모르면 skip 가능)
3. POST /api/kits/exercise/logs 로 저장

## 주간 넛지
- GET /api/kits/exercise/stats/weekly 로 이번 주 운동 횟수 확인
- 목표 대비 부족하면 "이번 주 운동 X회 했어요. 목표에 Y회 남았어요!" 넛지

## API
- POST /api/kits/exercise/logs — 활동 기록
- GET /api/kits/exercise/logs?date=YYYY-MM-DD — 날짜별 조회
- GET /api/kits/exercise/stats/weekly — 주간 통계
- GET /api/kits/exercise/types — 활동 유형 목록
