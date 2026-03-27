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
    // OpenClaw 게이트웨이 자동 감지
    const detectedPorts: number[] = [];
    for (const port of [18789, 18790, 18788, 3000]) {
      try {
        const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          const body = await res.text();
          if (body.toLowerCase().includes("openclaw")) detectedPorts.push(port);
        }
      } catch {}
    }

    let gatewayUrl: string;
    if (detectedPorts.length > 0) {
      console.log(`     ✅ OpenClaw detected:`);
      detectedPorts.forEach((p, i) => console.log(`        ${i + 1}) localhost:${p}`));
      if (detectedPorts.length > 1) console.log(`        ${detectedPorts.length + 1}) Enter manually`);
      const choice = promptWithDefault("     Select", "1");
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < detectedPorts.length) {
        gatewayUrl = `http://localhost:${detectedPorts[idx]}`;
      } else {
        const portInput = prompt("     Port: ");
        gatewayUrl = `http://localhost:${portInput}`;
      }
    } else {
      console.log("     ⚠️  No OpenClaw gateway detected. Is it running?");
      const portInput = promptWithDefault("     Port", "18789");
      gatewayUrl = `http://localhost:${portInput}`;
    }
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
// 다국어 텍스트
const T = {
  ko: {
    title: "🧰 LifeKit 초기 설정",
    envCheck: "1️⃣  환경 확인",
    basicInfo: "2️⃣  기본 정보",
    timezoneAuto: "타임존: %s (자동 감지)",
    aiAdapter: "3️⃣  AI 어댑터 선택",
    adapterPrompt: "선택 (1/2/3/4)",
    reviewTime: "4️⃣  회고 시간 설정",
    briefingPrompt: "모닝 브리핑 시간",
    reviewPrompt: "일일 회고 시간",
    weeklyReviewPrompt: "주간 회고 시간",
    done: "✅ LifeKit 초기 설정 완료!",
    startHint: "시작하기:",
    connectHint: "선택 연동:",
    googleHint: "구글 캘린더:",
    tailscaleHint: "원격 접속:",
    onboardingHint: "AI 온보딩:",
    onboardingDesc: "서버 실행 후 OpenClaw에게 \"LifeKit 온보딩 시작해줘\" 라고 말하면\n  대화형으로 각 영역별 초기 설정을 진행할 수 있어요.",
  },
  en: {
    title: "🧰 LifeKit Setup",
    envCheck: "1️⃣  Environment Check",
    basicInfo: "2️⃣  Basic Info",
    timezoneAuto: "Timezone: %s (auto-detected)",
    aiAdapter: "3️⃣  AI Adapter",
    adapterPrompt: "Select (1/2/3/4)",
    reviewTime: "4️⃣  Review Schedule",
    briefingPrompt: "Morning briefing time",
    reviewPrompt: "Daily review time",
    weeklyReviewPrompt: "Weekly review time",
    done: "✅ LifeKit setup complete!",
    startHint: "Get started:",
    connectHint: "Optional integrations:",
    googleHint: "Google Calendar:",
    tailscaleHint: "Remote access:",
    onboardingHint: "AI Onboarding:",
    onboardingDesc: "After starting the server, tell your OpenClaw agent:\n  \"Start LifeKit onboarding\"\n  to set up each life area through conversation.",
  },
};

export async function initCommand() {
  // 언어 먼저 선택 (기본: 영어)
  process.stdout.write("\n  🌐 Language / 언어\n");
  process.stdout.write("     1) English (default)\n");
  process.stdout.write("     2) 한국어\n");
  const langChoice = promptWithDefault("     Select / 선택 (1/2)", "1");
  const language = langChoice === "2" ? "ko" : "en";
  const t = T[language];

  console.log(`
  ${t.title}
  ─────────────────────
  `);

  // 1. 환경 체크
  console.log(`  ${t.envCheck}`);
  const bunVersion = Bun.version;
  console.log(`     Bun: v${bunVersion} ✅`);
  console.log("");

  // 2. 기본 정보
  console.log(`  ${t.basicInfo}`);
  const name = ""; // 에이전트 연결 후 온보딩 시 설정
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`     ${t.timezoneAuto.replace("%s", timezone)}`);
  const dataDir = "~/.lifekit/";
  console.log("");

  // 3. 데이터 디렉토리 생성
  const resolvedDataDir = dataDir.replace("~", homedir());
  if (!existsSync(resolvedDataDir)) {
    mkdirSync(resolvedDataDir, { recursive: true });
  }

  // 4. AI 어댑터 선택 + 연결 테스트
  console.log(`  ${t.aiAdapter}`);
  console.log("     1) openclaw (recommended)");
  console.log("     2) anthropic");
  console.log("     3) ollama");
  console.log("     4) manual");
  const adapterChoice = promptWithDefault(`     ${t.adapterPrompt}`, "1");
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
  console.log(`  ${t.reviewTime}`);
  const briefingTime = promptWithDefault(`     ${t.briefingPrompt} (HH:MM)`, "08:00");
  const reviewTime = promptWithDefault(`     ${t.reviewPrompt} (HH:MM)`, "22:00");
  const weeklyReviewTime = promptWithDefault(`     ${t.weeklyReviewPrompt} (HH:MM)`, "21:00");
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
  const isKo = language === "ko";
  console.log(`  ${t.done}
  ═══════════════════════════

  📦 ${t.startHint}
     bun run lifekit start

  🌐 ${isKo ? "접속" : "Access"}:
     ${isKo ? "로컬" : "Local"}:  http://localhost:5173

  🔗 ${t.connectHint}
     ${t.googleHint}    bun run lifekit connect google
     ${t.tailscaleHint} bun run lifekit connect tailscale

  🤖 ${t.onboardingHint}
     ${t.onboardingDesc}
  `);
}
