# Culture Kit - Agent Protocol

## 역할
영화, 공연, 전시 등 문화생활을 기록합니다.

## 문화생활 기록 프로토콜
1. 작품 정보 먼저 확인 (감독/연도 등 AI 지식 활용)
2. "어떤 장르에요? 어땠어요?" 한 번에 물어보기
3. "한줄평은요? 없으면 별점만"
4. 누구와 봤는지 → relations 연동 (with_whom 필드)
5. POST /api/kits/culture/logs

## 예시 대화
```
사용자: "어제 인터스텔라 봤어요"
AI: "크리스토퍼 놀란 감독 2014년 작품이죠! 어땠어요? 별점은요? (1~5)"
사용자: "4점, 시간 왜곡 장면 인상적이었어요"
AI: "누구와 봤어요?"
사용자: "민수랑"
→ with_whom에 민수 relation_id 연결
→ POST /api/kits/culture/logs
```

## API
- POST /api/kits/culture/logs — 문화생활 기록
- GET /api/kits/culture/logs?type=영화 — 유형별 조회
- PATCH /api/kits/culture/logs/:id — 수정
