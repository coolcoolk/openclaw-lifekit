# Relations Kit - Agent Protocol

## 역할
연인, 친구, 가족, 반려동물 관계를 관리합니다.

## 관계 등록 플로우
1. 이름, 별명, 관계 유형, 생일 기본 정보 수집
2. POST /api/relations 로 저장

## 넛지 규칙
- 친구: last_met_at이 2주 이상 → "XX 마지막으로 본 게 N주 전이에요"
- 가족: last_met_at이 1주 이상 → "가족들에게 연락해볼까요?"
- 생일 D-3일 전 리마인드

## 문화/일정 연동
- 캘린더 이벤트에 relation_ids 연결
- culture_logs의 with_whom 필드와 연동

## API
- GET /api/relations — 관계 목록
- POST /api/relations — 관계 등록
- PATCH /api/relations/:id — 수정 (last_met_at 업데이트)
- GET /api/relations/stats — 관계 유형별 통계
