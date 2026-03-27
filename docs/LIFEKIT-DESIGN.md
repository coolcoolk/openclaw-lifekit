# LifeKit — Design Document
> Personal Life OS Package for Local AI Assistants

**Version:** 0.1 (Draft)
**Last Updated:** 2026-03-23

---

## 1. Overview

LifeKit is a **standalone package** that turns any local AI assistant into a personal life management OS.

### Core Concept
- **AI-agnostic**: Works with OpenClaw, Ollama, LM Studio, Jan, or any local AI
- **Local-first**: All data stored locally (SQLite), no cloud dependency
- **Conversational**: AI drives the UX — no separate app to learn
- **Visual dashboard**: Web UI for at-a-glance life balance view

### One-liner
> "Install LifeKit, connect your AI, and start managing your life — all in one conversation."

---

## 2. User Journey

### 2-1. Discovery & Install
```bash
# Option A: npm
npm install -g lifekit

# Option B: Homebrew (macOS)
brew install lifekit

# Option C: Direct download
curl -fsSL https://lifekit.dev/install | sh
```

### 2-2. Init (One-time Setup)
```bash
lifekit init
```

CLI steps:
1. **Environment check** — Node/Bun version, port conflicts
2. **Basic info** — Name, language, timezone, data directory (~/.lifekit/)
3. **Tailscale** — Auto-install (brew) or fallback to https://tailscale.com/download
4. **AI Adapter** — OpenClaw / Ollama / Manual
5. **Google Calendar** (optional)
   - `gws auth login` → browser OAuth flow
   - On success: fetch last 30 days of events
   - Analyze patterns (frequency, categories, time slots)
   - Save summary to config for AI context during onboarding
   - If skipped: `lifekit connect google` available later
6. **Completion + Access guide**
   - Auto-detect Tailscale IP
   - Show access URLs (localhost + Tailscale IP)
   - Per-device guide (iPhone/Android/Mac/PC)
   - Bookmark / PWA install guide

→ Saves `~/.lifekit/config.json`
→ Injects `LIFEKIT.md` into the AI's context/workspace
→ Starts server + dashboard
→ **Onboarding begins automatically via AI conversation**

### 2-3. Onboarding (via AI)

**Phase 1 — Common onboarding (required, once)**
1. Basic profile (name, DOB, timezone, MBTI)
2. Routine times (daily briefing, daily review, weekly review)
3. Google Calendar already connected via init → AI uses past 30-day context

**Phase 2 — Area onboarding (optional, per area)**
- User chooses which areas to set up
- Unset areas shown in Balance dashboard as `[+ 설정하기]`
- Clicking triggers AI conversation for that specific area
- On complete → area shows level + data in dashboard

All responses → saved to SQLite via LifeKit API.

### 2-4. Daily Use
```
Morning: AI sends daily briefing (tasks + calendar + nudges)
Evening: AI sends daily review prompt
Weekly: AI sends weekly review
Ad-hoc: "재즈방 약속 추가해줘" → AI calls LifeKit API
```

---

## 3. Architecture

```
lifekit/
├── packages/
│   ├── server/          # Hono + SQLite + Drizzle ORM
│   │   ├── src/
│   │   │   ├── routes/  # REST API endpoints
│   │   │   ├── db/      # Schema, migrations, seed
│   │   │   └── index.ts
│   │   └── data/        # lifekit.db (local)
│   │
│   └── web/             # React + Vite + Shadcn/ui
│       └── src/
│           ├── pages/   # Calendar, Tasks, Balance, Settings
│           └── layouts/ # Sidebar, BottomNav (mobile)
│
├── adapters/            # AI-specific integration
│   ├── openclaw/        # OpenClaw workspace injection
│   ├── ollama/          # Ollama system prompt injection
│   └── openai/          # OpenAI-compatible API wrapper
│
├── LIFEKIT.md           # Master AI instruction file
├── cli/                 # lifekit CLI (init, start, status)
└── docs/
    ├── DESIGN.md        # This file
    └── ONBOARDING.md    # Onboarding flow spec
```

---

## 4. LIFEKIT.md — The AI Instruction File

This is the **core of LifeKit**. Injected into any AI's context.

### Contents:
1. **Role definition** — What LifeKit is, what the AI should do
2. **Domain & Area structure** — 7 domains, 18+ areas
3. **Area-specific instructions** — Role per area (tracking, nudging, conversing)
4. **API reference** — How to call LifeKit server endpoints
5. **Routine schedule** — Briefing/review times
6. **User profile** — Populated during onboarding

### Structure:
```markdown
# LIFEKIT.md

## Role
You are [User's AI Assistant] with LifeKit installed.
LifeKit manages [User]'s life across 7 domains...

## API
Base URL: http://localhost:4000/api
Endpoints: /calendar/events, /tasks, /areas, /onboarding...

## User Profile
Name: ...
Timezone: ...
[populated after onboarding]

## Domains & Areas
[7 domains × areas with role instructions]

## Routines
Daily briefing: 06:00
Daily review: 22:00
Weekly review: Sunday 22:00
```

---

## 5. API Design

### Core Endpoints

```
# Onboarding
GET    /api/onboarding/status
POST   /api/onboarding/profile
POST   /api/onboarding/area/:areaId

# Calendar
GET    /api/calendar/events?start=&end=
POST   /api/calendar/events
PATCH  /api/calendar/events/:id
DELETE /api/calendar/events/:id

# Tasks
GET    /api/tasks?date=&status=&domainId=
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id

# Areas / Balance
GET    /api/areas
GET    /api/areas/:id
PATCH  /api/areas/:id/satisfaction
GET    /api/areas/:id/history

# Domains
GET    /api/domains

# Projects
GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id
```

---

## 6. DB Schema Extensions Needed

Current schema covers: domains, areas, projects, tasks, calendar_events, notes, satisfaction_history

**New tables needed:**

```sql
-- User profile (from onboarding)
user_profile (
  id, name, dob, timezone, language, mbti,
  height, weight, created_at, updated_at
)

-- Area onboarding data (character sheet)
area_onboarding (
  id, area_id, level, goal, notes,
  custom_data JSON,  -- area-specific fields
  completed_at, updated_at
)

-- Routine config
routines (
  id, name, schedule_cron, enabled,
  last_run_at, config JSON
)
```

---

## 7. Adapter System

Each adapter handles:
1. **Injection** — How to inject LIFEKIT.md into the AI
2. **Trigger** — How to trigger routines (cron, webhook, etc.)
3. **Message** — How the AI sends messages to the user

### OpenClaw Adapter
```
Injection: Write LIFEKIT.md to workspace/
Trigger:   openclaw cron (existing)
Message:   message tool → Telegram/Signal/etc.
```

### Ollama Adapter
```
Injection: Prepend to system prompt via Modelfile
Trigger:   lifekit cron (built-in scheduler)
Message:   Desktop notification / email
```

### Manual Adapter
```
Injection: User copies LIFEKIT.md to AI's context manually
Trigger:   lifekit cron (built-in scheduler)
Message:   lifekit notify (OS notification)
```

---

## 8. Onboarding Flow

```
lifekit init
    ↓
AI receives LIFEKIT.md (with empty profile)
    ↓
AI: "LifeKit 온보딩 시작할게요! 먼저 기본 정보부터..."
    ↓
User answers → POST /api/onboarding/profile
    ↓
For each domain:
  AI: "🏃 건강 영역 온보딩..." (with role intro)
  User answers → POST /api/onboarding/area/:id
    ↓
AI: "온보딩 완료! 이제부터 함께 관리해드릴게요."
    ↓
LIFEKIT.md auto-updated with user profile
    ↓
Routines activated
```

---

## 9. Roadmap

### v0.1 — MVP (Current)
- [x] Server (Hono + SQLite)
- [x] Web dashboard (Calendar, Tasks, Balance)
- [x] OpenClaw adapter
- [x] Mobile responsive
- [ ] Onboarding API
- [ ] LIFEKIT.md standardization

### v0.2 — Package
- [ ] CLI (lifekit init/start/status)
- [ ] npm package
- [ ] Ollama adapter
- [ ] Auto LIFEKIT.md injection

### v0.3 — Polish
- [ ] i18n (Korean / English)
- [ ] XP/level system
- [ ] Google Calendar sync
- [ ] Brew formula

### v1.0 — Public Release
- [ ] lifekit.dev landing page
- [ ] Documentation site
- [ ] Community adapters

---

## 11. XP & Level System

### Rules
- 1분 = 1 XP
- 태스크 완료: 예상 시간(분) × 1 XP (기본 60분 = 60 XP)
- 프로젝트 완료: 포함 태스크 총 XP × 0.5 보너스
- 태스크 기본 단위: 1시간 (타임박싱)
- 3시간 이상 태스크는 쪼개기 원칙

### Level Table (우주 테마)
| Level | Name | Hours | XP |
|-------|------|-------|-----|
| 1 | 🌫️ 먼지 | 0h | 0 |
| 2 | 🪨 소행성 | 1h | 60 |
| 3 | ☄️ 유성 | 5h | 300 |
| 4 | 🌑 위성 | 15h | 900 |
| 5 | 🪐 행성 | 40h | 2,400 |
| 6 | ⭐ 별 | 100h | 6,000 |
| 7 | 🌟 거성 | 300h | 18,000 |
| 8 | 💥 초신성 | 800h | 48,000 |
| 9 | 🌀 블랙홀 | 2,000h | 120,000 |
| 10 | 🌌 은하 | 5,000h | 300,000 |
| 11+ | ✨ 우주 | 10,000h+ | 600,000+ |

기반: 말콤 글래드웰 10,000시간 법칙 + 학습 곡선 (초반 빠른 성장, 후반 수렴)

### Task & Project Philosophy
**Task**
- 한 번 앉아서 끝낼 수 있는 단위 (기본 1시간)
- 명확한 완료 조건 필요
- 3시간 이상이면 쪼개기
- 다음에 뭘 해야 할지 바로 알 수 있는 구체적 행동

**Project**
- 2개 이상의 태스크가 필요한 의미있는 결과물
- 완료했을 때 "뭔가 달라진" 상태가 있어야 함
- 명확한 목표와 변화하는 상태 필요
- 기간 1주 이상

## 12. Key Decisions

| 결정 | 이유 |
|------|------|
| SQLite (not PostgreSQL) | Local-first, zero config |
| Hono (not Express) | Lightweight, TypeScript-native |
| LIFEKIT.md as AI bridge | AI-agnostic, human-readable |
| Adapter pattern | Extensible without core changes |
| npm package | Cross-platform, easy install |
