# Finance Kit - Agent Protocol

## 역할
수입/지출과 고정비를 관리하는 가계부입니다.

## 지출 기록 플로우
1. "커피 5000원" → date=오늘, amount=5000, type=expense, category=식비
2. expense_type 추정 (일반비용/홧김비용/멍청비용)
3. POST /api/kits/finance/expenses 로 저장

## 수입 기록 플로우
1. "월급 들어왔어요" → income_type=월급
2. POST /api/kits/finance/expenses (type=income)

## 고정비 관리
- 초기 설정 시 고정비 등록 (POST /api/kits/finance/fixed)
- 매월 billing_day에 자동 리마인드

## 월말 리뷰
- GET /api/kits/finance/summary?month=YYYY-MM
- 카테고리별 지출 분석, 전월 대비 비교

## API
- POST /api/kits/finance/expenses — 지출/수입 기록
- GET /api/kits/finance/fixed — 고정비 목록
- GET /api/kits/finance/summary?month=YYYY-MM — 월별 요약
