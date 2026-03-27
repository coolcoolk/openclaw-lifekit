# OpenClaw LifeKit

> 에이전트의 비서력을 극대화하는 로컬 Life OS

OpenClaw, Perplexity Computer, 또는 Claude와 연결해서 쓰는 로컬 라이프 관리 시스템.

## 특징
- 로컬 SQLite DB (데이터가 내 기기 밖으로 안 나감)
- 7도메인 18영역 온보딩 → AI가 내 삶의 컨텍스트 파악
- 태스크/캘린더/프로젝트/밸런스/리포트 대시보드
- OpenClaw, Anthropic, Ollama 어댑터 지원

## 빠른 시작

### 1. 설치
```bash
git clone https://github.com/your-repo/openclaw-lifekit
cd openclaw-lifekit
bun install
```

### 2. 환경 설정
```bash
cp packages/server/.env.example packages/server/.env
# .env 파일 편집: LIFEKIT_AI_ADAPTER와 관련 설정 입력
```

**OpenClaw 사용 시 (권장):**
```
LIFEKIT_AI_ADAPTER=openclaw
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=your-gateway-token
```

**Anthropic 직접 사용 시:**
```
LIFEKIT_AI_ADAPTER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. 실행
```bash
# 서버 (포트 4000)
bun run dev:server

# 웹 대시보드 (포트 5173)
bun run dev:web
```

### 4. 외부 서비스 연동 (선택)
```bash
# 구글 캘린더 연동
lifekit connect google

# Tailscale 원격 접속
lifekit connect tailscale
```

### 5. 접속
브라우저에서 http://localhost:5173 열기 → 밸런스 페이지에서 온보딩 시작

## AI 연결 방법

### OpenClaw
openclaw.json에 chatCompletions 활성화:
```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  }
}
```

그 후 LIFEKIT.md를 OpenClaw 에이전트의 워크스페이스에 복사하면 에이전트가 LifeKit API를 활용합니다.

## 기술 스택
- **서버**: Bun + Hono + SQLite (Drizzle ORM)
- **웹**: React + Vite + Tailwind + shadcn/ui + FullCalendar
- **AI**: OpenClaw / Anthropic Claude / Ollama (선택)
