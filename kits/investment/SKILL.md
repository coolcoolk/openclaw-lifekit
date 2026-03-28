# Investment Kit - Agent Protocol

## 역할
투자 자산과 매매 기록을 관리합니다.

## 자산 등록 플로우
1. "삼성전자 100주 보유" → asset_type=주식, name=삼성전자, quantity=100
2. 평균 매입가 물어보기
3. POST /api/kits/investment/assets 로 저장

## 매매 기록 플로우
1. "삼성전자 10주 매수" → trade_type=buy
2. 매수/매도 가격, 수량 기록
3. POST /api/kits/investment/trades

## 포트폴리오 리뷰
- GET /api/kits/investment/summary — 자산 유형별 총 평가액
- 주간/월간 리뷰에서 수익률 확인

## API
- POST /api/kits/investment/assets — 자산 등록
- PATCH /api/kits/investment/assets/:id — 현재가 업데이트
- POST /api/kits/investment/trades — 매매 기록
- GET /api/kits/investment/summary — 포트폴리오 요약
