import { resolve } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";

const LIFEKIT_DIR = resolve(homedir(), ".lifekit");
const CONFIG_PATH = resolve(LIFEKIT_DIR, "config.json");
// packages/server 기준 경로
const PROJECT_ROOT = resolve(import.meta.dir, "../../../../");
const SERVER_DATA_DIR = resolve(PROJECT_ROOT, "packages/server/data");
const SETTINGS_PATH = resolve(SERVER_DATA_DIR, "settings.json");
const SERVER_ENV_PATH = resolve(PROJECT_ROOT, "packages/server/.env");

const DEFAULT_SETTINGS = {
  profile: {
    name: "",
    birthDate: "",
    timezone: "Asia/Seoul",
    mbti: "",
  },
  routine: {
    briefingTime: "08:00",
    reviewTime: "22:00",
    weeklyReviewTime: "21:00",
  },
  ai: {
    provider: "anthropic" as const,
    apiKey: "",
    model: "claude-sonnet-4-5-20250929",
  },
  googleCalendar: {
    connected: false,
    syncIntervalMin: 5,
  },
  notifications: {
    briefing: true,
    review: true,
    taskReminder: true,
  },
  dashboard: {
    defaultPage: "calendar",
    theme: "light" as const,
    language: "ko" as const,
  },
};

function prompt(question: string): string {
  process.stdout.write(question);
  const buf = Buffer.alloc(1024);
  const fd = require("fs").openSync("/dev/stdin", "rs");
  const n = require("fs").readSync(fd, buf, 0, buf.length, null);
  require("fs").closeSync(fd);
  return buf.toString("utf8", 0, n).trim();
}

function promptWithDefault(question: string, defaultValue: string): string {
  const answer = prompt(`${question} (${defaultValue}): `);
  return answer || defaultValue;
}

function promptSecret(question: string): string {
  const answer = prompt(`${question}: `);
  return answer;
}

// ── AI 연결 테스트 ──
async function testAiConnection(adapter: string): Promise<{ envLines: string[] }> {
  const envLines: string[] = [];

  if (adapter === "openclaw") {
    console.log("\n  🔗 OpenClaw 연결 설정");
    const gatewayUrl = promptWithDefault("     Gateway URL", "http://localhost:18789");
    const gatewayToken = promptSecret("     Gateway Token");

    envLines.push(`LIFEKIT_AI_ADAPTER=openclaw`);
    envLines.push(`OPENCLAW_GATEWAY_URL=${gatewayUrl}`);
    envLines.push(`OPENCLAW_GATEWAY_TOKEN=${gatewayToken}`);
    envLines.push(`OPENCLAW_AGENT_ID=main`);

    // 연결 테스트
    console.log("\n     🧪 연결 테스트 중...");
    try {
      const resp = await fetch(`${gatewayUrl}/`, {
        headers: gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        console.log("     ✅ OpenClaw 연결 성공!");
      } else {
        console.log(`     ⚠️  응답 코드: ${resp.status} — 서버 실행 후 다시 확인해주세요.`);
      }
    } catch (e: any) {
      console.log(`     ⚠️  연결 실패 (${e.message}) — 서버 실행 후 다시 확인해주세요.`);
    }
  } else if (adapter === "anthropic") {
    console.log("\n  🔗 Anthropic API 설정");
    const apiKey = promptSecret("     API Key (sk-ant-...)");

    envLines.push(`LIFEKIT_AI_ADAPTER=anthropic`);
    envLines.push(`ANTHROPIC_API_KEY=${apiKey}`);
  } else if (adapter === "ollama") {
    const ollamaModel = promptWithDefault("     Ollama 모델", "llama3.2");
    const ollamaUrl = promptWithDefault("     Ollama URL", "http://localhost:11434");

    envLines.push(`LIFEKIT_AI_ADAPTER=ollama`);
    envLines.push(`OLLAMA_MODEL=${ollamaModel}`);
    envLines.push(`OLLAMA_BASE_URL=${ollamaUrl}`);
  }

  return { envLines };
}

// ── settings.json 저장 ──
function saveSettingsJson(data: {
  name: string;
  timezone: string;
  language: string;
  briefingTime: string;
  reviewTime: string;
  weeklyReviewTime: string;
}) {
  // data 디렉토리 생성
  if (!existsSync(SERVER_DATA_DIR)) {
    mkdirSync(SERVER_DATA_DIR, { recursive: true });
  }

  // 기존 settings.json merge 또는 새로 생성
  let settings: any;
  if (existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    } catch {
      settings = { ...DEFAULT_SETTINGS };
    }
  } else {
    settings = { ...DEFAULT_SETTINGS };
  }

  // deep merge: 각 섹션별 spread
  settings.profile = {
    ...(settings.profile || DEFAULT_SETTINGS.profile),
    name: data.name,
    timezone: data.timezone,
  };
  settings.dashboard = {
    ...(settings.dashboard || DEFAULT_SETTINGS.dashboard),
    language: data.language,
  };
  settings.routine = {
    ...(settings.routine || DEFAULT_SETTINGS.routine),
    briefingTime: data.briefingTime,
    reviewTime: data.reviewTime,
    weeklyReviewTime: data.weeklyReviewTime,
  };

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  console.log(`  💾 설정 저장: ${SETTINGS_PATH}`);
}

// ── .env 파일 저장 ──
function saveEnvFile(envLines: string[]) {
  writeFileSync(SERVER_ENV_PATH, envLines.join("\n") + "\n");
  console.log(`  💾 환경변수 저장: ${SERVER_ENV_PATH}`);
}

// ── 메인 init 커맨드 ──
export async function initCommand() {
  console.log(`
  🧰 LifeKit 초기 설정
  ─────────────────────
  `);

  // 1. 환경 체크
  console.log("  1️⃣  환경 확인");
  const bunVersion = Bun.version;
  console.log(`     Bun: v${bunVersion} ✅`);
  console.log("");

  // 2. 기본 정보
  console.log("  2️⃣  기본 정보");
  const name = promptWithDefault("     이름", "User");
  const language = promptWithDefault("     언어 (ko/en)", "ko");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`     타임존: ${timezone} (자동 감지)`);
  const dataDir = "~/.lifekit/";
  console.log("");

  // 3. 데이터 디렉토리 생성
  const resolvedDataDir = dataDir.replace("~", homedir());
  if (!existsSync(resolvedDataDir)) {
    mkdirSync(resolvedDataDir, { recursive: true });
    console.log(`  📁 데이터 디렉토리 생성: ${resolvedDataDir}`);
  }

  // 4. AI 어댑터 선택 + 연결 테스트
  console.log("  4️⃣  AI 어댑터 선택");
  console.log("     1) openclaw (권장)");
  console.log("     2) anthropic");
  console.log("     3) ollama");
  console.log("     4) manual (나중에 직접 설정)");
  const adapterChoice = promptWithDefault("     선택 (1/2/3/4)", "1");
  const adapterMap: Record<string, string> = { "1": "openclaw", "2": "anthropic", "3": "ollama", "4": "manual" };
  const adapter = adapterMap[adapterChoice] || "openclaw";
  console.log(`     → ${adapter} 선택됨`);

  // AI 연결 테스트 + .env 생성
  let envLines: string[] = [];
  if (adapter !== "manual") {
    const aiResult = await testAiConnection(adapter);
    envLines = aiResult.envLines;
  }
  console.log("");

  // 6. 회고 시간 설정
  console.log("  5️⃣  회고 시간 설정");
  const briefingTime = promptWithDefault("     모닝 브리핑 시간 (HH:MM)", "08:00");
  const reviewTime = promptWithDefault("     일일 회고 시간 (HH:MM)", "22:00");
  console.log("     주간 회고 요일: 일요일");
  const weeklyReviewTime = promptWithDefault("     주간 회고 시간 (HH:MM)", "21:00");
  console.log("");

  // ── 저장 ──

  // config.json 저장 (~/.lifekit/config.json)
  if (!existsSync(LIFEKIT_DIR)) {
    mkdirSync(LIFEKIT_DIR, { recursive: true });
  }

  const config: Record<string, any> = {
    name,
    language,
    timezone,
    dataDir,
    adapter,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`  💾 설정 저장: ${CONFIG_PATH}`);

  // settings.json 저장 (packages/server/data/settings.json)
  saveSettingsJson({
    name,
    timezone,
    language,
    briefingTime,
    reviewTime,
    weeklyReviewTime,
  });

  // .env 파일 저장 (packages/server/.env)
  if (envLines.length > 0) {
    saveEnvFile(envLines);
  }

  console.log("");

  // ── 완료 안내 ──
  console.log(`  ✅ LifeKit 초기 설정 완료!
  ═══════════════════════════

  📦 시작하기:
     lifekit start

  🌐 접속:
     로컬:      http://localhost:5173

  🔗 선택 연동:
     구글 캘린더:  lifekit connect google
     원격 접속:   lifekit connect tailscale

  🤖 AI 온보딩:
     서버 실행 후 OpenClaw에게 "LifeKit 온보딩 시작해줘" 라고 말하면
     대화형으로 각 영역별 초기 설정을 진행할 수 있어요.

     • 전체 영역 한 번에 or 원하는 영역만 선택 가능
     • 나중에 http://localhost:5173 밸런스 페이지에서도 진행 가능
  `);
}
