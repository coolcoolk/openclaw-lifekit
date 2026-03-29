import { resolve } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { homedir } from "os";

// enquirer: require individual prompts (runtime exports, no TS declarations)
const { Select, MultiSelect, Input, Password } = require("enquirer");

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
    weeklyReviewDay: 0,
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

// ── Kit 메타데이터 ──
const KITS_DIR = resolve(PROJECT_ROOT, "kits");

interface KitMeta {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  guide: string;
}

const KIT_EMOJI: Record<string, string> = {
  exercise: "🏃",
  diet: "🥗",
  finance: "💰",
  investment: "📈",
  relations: "👥",
  "self-dev": "📚",
  culture: "🎭",
  fashion: "👔",
  hobby: "🎯",
};

// 표시 순서
const KIT_ORDER = ["exercise", "diet", "finance", "investment", "relations", "self-dev", "culture", "fashion", "hobby"];

function loadKits(): KitMeta[] {
  const kits: KitMeta[] = [];
  if (!existsSync(KITS_DIR)) return kits;

  const dirs = readdirSync(KITS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const kitJsonPath = resolve(KITS_DIR, dir, "kit.json");
    if (existsSync(kitJsonPath)) {
      try {
        const meta = JSON.parse(readFileSync(kitJsonPath, "utf-8"));
        kits.push(meta);
      } catch {}
    }
  }

  // 정렬
  kits.sort((a, b) => {
    const ai = KIT_ORDER.indexOf(a.id);
    const bi = KIT_ORDER.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return kits;
}

// ── Kit 설치 ──
async function installKits(kitIds: string[], language: string): Promise<void> {
  const isKo = language === "ko";
  if (kitIds.length === 0) {
    console.log(isKo
      ? "     ⏭️  Kit을 선택하지 않았어요. 나중에 프로젝트 탭에서 활성화할 수 있어요."
      : "     ⏭️  No kits selected. You can enable them later in the project tab.");
    return;
  }

  // 서버 연결 확인
  let serverOk = false;
  try {
    const res = await fetch("http://localhost:4000/api/health", { signal: AbortSignal.timeout(2000) });
    serverOk = res.ok;
  } catch {}

  if (!serverOk) {
    console.log(isKo
      ? "     ⚠️  서버가 실행 중이지 않아요. 서버 실행 후 프로젝트 탭에서 Kit을 활성화할 수 있어요."
      : "     ⚠️  Server not running. You can enable kits in the project tab after starting the server.");
    return;
  }

  console.log(isKo ? "     📦 Kit 설치 중..." : "     📦 Installing kits...");
  for (const kitId of kitIds) {
    try {
      const res = await fetch(`http://localhost:4000/api/kits/${kitId}/install`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        console.log(`     ✅ ${kitId}`);
      } else {
        console.log(`     ⚠️  ${kitId} (${res.status})`);
      }
    } catch (e: any) {
      console.log(`     ⚠️  ${kitId} (${e.message})`);
    }
  }
}

// ── AI 연결 테스트 ──
async function testAiConnection(adapter: string, language: string): Promise<{ envLines: string[] }> {
  const isKo = language === "ko";
  const envLines: string[] = [];

  if (adapter === "openclaw") {
    console.log(isKo ? "\n  🔗 OpenClaw 연결 설정" : "\n  🔗 OpenClaw Connection Setup");

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
      const portChoices = [
        ...detectedPorts.map((p) => `localhost:${p}`),
        isKo ? "직접 입력" : "Enter manually",
      ];

      const portSelection: string = await new Select({
        name: "port",
        message: isKo ? "OpenClaw 감지됨" : "OpenClaw detected",
        choices: portChoices,
      }).run();

      if (portSelection.startsWith("localhost:")) {
        gatewayUrl = `http://${portSelection}`;
      } else {
        const portInput: string = await new Input({
          name: "port",
          message: "Port",
          initial: "18789",
        }).run();
        gatewayUrl = `http://localhost:${portInput}`;
      }
    } else {
      console.log(isKo
        ? "     ⚠️  OpenClaw 게이트웨이를 찾을 수 없어요. 실행 중인지 확인해주세요."
        : "     ⚠️  No OpenClaw gateway detected. Is it running?");
      const portInput: string = await new Input({
        name: "port",
        message: "Port",
        initial: "18789",
      }).run();
      gatewayUrl = `http://localhost:${portInput}`;
    }

    const gatewayToken: string = await new Password({
      name: "token",
      message: "Gateway Token",
    }).run();

    // 에이전트 이름 자동 조회
    try {
      const nameRes = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${gatewayToken}` },
        body: JSON.stringify({ model: "openclaw:main", messages: [{ role: "user", content: "What is your name? Reply in one word only." }], max_tokens: 20 }),
        signal: AbortSignal.timeout(5000),
      });
      if (nameRes.ok) {
        const nameData = await nameRes.json() as any;
        const agentName = nameData?.choices?.[0]?.message?.content?.trim();
        if (agentName) console.log(`     🤖 Agent: ${agentName}`);
      }
    } catch {}

    envLines.push(`LIFEKIT_AI_ADAPTER=openclaw`);
    envLines.push(`OPENCLAW_GATEWAY_URL=${gatewayUrl}`);
    envLines.push(`OPENCLAW_GATEWAY_TOKEN=${gatewayToken}`);
    envLines.push(`OPENCLAW_AGENT_ID=main`);

    // 연결 테스트
    console.log(isKo ? "\n     🧪 연결 테스트 중..." : "\n     🧪 Testing connection...");
    try {
      const resp = await fetch(`${gatewayUrl}/`, {
        headers: gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        console.log(isKo ? "     ✅ OpenClaw 연결 성공!" : "     ✅ OpenClaw connected!");
      } else {
        console.log(isKo
          ? `     ⚠️  응답 코드: ${resp.status} — 서버 실행 후 다시 확인해주세요.`
          : `     ⚠️  Response: ${resp.status} — please check after starting the server.`);
      }
    } catch (e: any) {
      console.log(isKo
        ? `     ⚠️  연결 실패 (${e.message}) — 서버 실행 후 다시 확인해주세요.`
        : `     ⚠️  Connection failed (${e.message}) — please check after starting the server.`);
    }
  } else if (adapter === "anthropic") {
    console.log(isKo ? "\n  🔗 Anthropic API 설정" : "\n  🔗 Anthropic API Setup");
    const apiKey: string = await new Password({
      name: "apiKey",
      message: "API Key (sk-ant-...)",
    }).run();

    envLines.push(`LIFEKIT_AI_ADAPTER=anthropic`);
    envLines.push(`ANTHROPIC_API_KEY=${apiKey}`);
  } else if (adapter === "ollama") {
    const ollamaModel: string = await new Input({
      name: "model",
      message: isKo ? "Ollama 모델" : "Ollama model",
      initial: "llama3.2",
    }).run();
    const ollamaUrl: string = await new Input({
      name: "url",
      message: "Ollama URL",
      initial: "http://localhost:11434",
    }).run();

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
  weeklyReviewDay: number;
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
    weeklyReviewDay: data.weeklyReviewDay,
  };

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  console.log(`  💾 설정 저장: ${SETTINGS_PATH}`);
}

// ── .env 파일 저장 ──
function saveEnvFile(envLines: string[]) {
  // 기존 .env 파일에서 새 키에 해당하지 않는 라인 보존 (e.g. NOTION_TOKEN)
  const newKeys = new Set(envLines.map((l) => l.split("=")[0]));
  let existing: string[] = [];
  if (existsSync(SERVER_ENV_PATH)) {
    existing = readFileSync(SERVER_ENV_PATH, "utf-8")
      .split("\n")
      .filter((l) => l.trim() && !newKeys.has(l.split("=")[0]));
  }
  const merged = [...envLines, ...existing];
  writeFileSync(SERVER_ENV_PATH, merged.join("\n") + "\n");
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
    adapterPrompt: "AI 어댑터 선택",
    kitSelect: "4️⃣  Kit 선택",
    kitNone: "Kit이 없어요",
    googleCalStep: "5️⃣  구글 캘린더 연동",
    tailscaleStep: "6️⃣  원격 접속 (Tailscale)",
    reviewTime: "7️⃣  회고 시간 설정",
    briefingPrompt: "모닝 브리핑 시간 (HH:MM)",
    reviewPrompt: "일일 회고 시간 (HH:MM)",
    weeklyReviewPrompt: "주간 회고 시간 (HH:MM)",
    done: "✅ LifeKit 초기 설정 완료!",
    startHint: "시작하기:",
    connectHint: "선택 연동:",
    googleHint: "구글 캘린더:",
    tailscaleHint: "원격 접속:",
    onboardingHint: "AI 온보딩:",
    onboardingDesc: "서버 실행 후 OpenClaw에게 \"LifeKit 온보딩 시작해줘\" 라고 말하면\n  대화형으로 각 영역별 초기 설정을 진행할 수 있어요.",
    kitAddLater: "Kit은 프로젝트 탭에서 언제든 추가/제거할 수 있어요.",
  },
  en: {
    title: "🧰 LifeKit Setup",
    envCheck: "1️⃣  Environment Check",
    basicInfo: "2️⃣  Basic Info",
    timezoneAuto: "Timezone: %s (auto-detected)",
    aiAdapter: "3️⃣  AI Adapter",
    adapterPrompt: "AI Adapter",
    kitSelect: "4️⃣  Select Kits",
    kitNone: "No kits found",
    googleCalStep: "5️⃣  Google Calendar",
    tailscaleStep: "6️⃣  Remote Access (Tailscale)",
    reviewTime: "7️⃣  Review Schedule",
    briefingPrompt: "Morning briefing time (HH:MM)",
    reviewPrompt: "Daily review time (HH:MM)",
    weeklyReviewPrompt: "Weekly review time (HH:MM)",
    done: "✅ LifeKit setup complete!",
    startHint: "Get started:",
    connectHint: "Optional integrations:",
    googleHint: "Google Calendar:",
    tailscaleHint: "Remote access:",
    onboardingHint: "AI Onboarding:",
    onboardingDesc: "After starting the server, tell your OpenClaw agent:\n  \"Start LifeKit onboarding\"\n  to set up each life area through conversation.",
    kitAddLater: "You can add/remove Kits anytime in the project tab.",
  },
};

export async function initCommand() {
  // 1. 언어 선택
  const language: string = await new Select({
    name: "language",
    message: "Language / 언어",
    choices: [
      { name: "ko", message: "한국어" },
      { name: "en", message: "English" },
    ],
  }).run();

  const t = T[language as keyof typeof T];
  const isKo = language === "ko";

  console.log(`
  ${t.title}
  ─────────────────────
  `);

  // 2. 환경 체크
  console.log(`  ${t.envCheck}`);
  const bunVersion = Bun.version;
  console.log(`     Bun: v${bunVersion} ✅`);
  console.log("");

  // 3. 기본 정보
  console.log(`  ${t.basicInfo}`);
  const name = ""; // 에이전트 연결 후 온보딩 시 설정
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`     ${t.timezoneAuto.replace("%s", timezone)}`);
  const dataDir = "~/.lifekit/";
  console.log("");

  // 4. 데이터 디렉토리 생성
  const resolvedDataDir = dataDir.replace("~", homedir());
  if (!existsSync(resolvedDataDir)) {
    mkdirSync(resolvedDataDir, { recursive: true });
  }

  // 5. AI 어댑터 선택
  console.log(`  ${t.aiAdapter}`);
  const adapterChoiceMap: Record<string, string> = {
    "OpenClaw (추천)": "openclaw",
    "OpenClaw (recommended)": "openclaw",
    "Anthropic": "anthropic",
    "Ollama": "ollama",
    "Manual": "manual",
  };

  const adapterLabel: string = await new Select({
    name: "adapter",
    message: t.adapterPrompt,
    choices: isKo
      ? ["OpenClaw (추천)", "Anthropic", "Ollama", "Manual"]
      : ["OpenClaw (recommended)", "Anthropic", "Ollama", "Manual"],
  }).run();

  const adapter = adapterChoiceMap[adapterLabel] || "openclaw";
  console.log(`     → ${adapter}`);

  // AI 연결 테스트 + .env 생성
  let envLines: string[] = [];
  if (adapter !== "manual") {
    const aiResult = await testAiConnection(adapter, language);
    envLines = aiResult.envLines;
  }
  console.log("");

  // 6. Kit 선택
  const kits = loadKits();
  let selectedKitIds: string[] = [];
  if (kits.length > 0) {
    console.log(`  ${t.kitSelect}`);
    selectedKitIds = await new MultiSelect({
      name: "kits",
      message: isKo
        ? "사용할 Kit을 선택해주세요 (나중에 프로젝트 탭에서 언제든 추가할 수 있어요)\n  스페이스: 선택/해제 | 엔터: 확인 (선택 없이 엔터 시 skip)"
        : "Select Kits (you can add more later in the project tab)\n  Space: toggle | Enter: confirm (enter without selection to skip)",
      choices: kits.map((k) => {
        const emoji = KIT_EMOJI[k.id] || "📦";
        return {
          name: k.id,
          message: `${emoji} ${isKo ? k.name : k.nameEn}`,
          hint: isKo ? k.description : k.guide,
        };
      }),
    }).run();

    if (selectedKitIds.length > 0) {
      const names = selectedKitIds.map((id) => {
        const kit = kits.find((k) => k.id === id);
        const emoji = KIT_EMOJI[id] || "📦";
        return `${emoji} ${isKo ? kit?.name : kit?.nameEn}`;
      });
      console.log(`     → ${names.join(", ")}`);
    }
    await installKits(selectedKitIds, language);
  } else {
    console.log(`  ${t.kitNone}`);
  }
  console.log("");

  // 7. 구글 캘린더 연동
  console.log(`  ${t.googleCalStep}`);
  const googleChoice: string = await new Select({
    name: "google",
    message: isKo
      ? "구글 캘린더를 연동하시겠어요?\n  연동하면 일정이 자동으로 LifeKit 캘린더에 동기화되고,\n  AI가 일정을 인식해서 미리 알림과 준비 도움을 드릴 수 있어요."
      : "Connect Google Calendar?\n  Your schedule will sync automatically and AI can help with reminders.",
    choices: isKo
      ? ["지금 연동하기", "나중에 연동 (lifekit connect google)"]
      : ["Connect now", "Later (lifekit connect google)"],
  }).run();

  if (googleChoice === "지금 연동하기" || googleChoice === "Connect now") {
    // connect.ts의 google 연동 로직 실행
    const proc = Bun.spawn(["bun", "run", "lifekit", "connect", "google"], {
      cwd: PROJECT_ROOT,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });
    await proc.exited;
  } else {
    console.log(isKo
      ? "     ⏭️  나중에 lifekit connect google 으로 연동할 수 있어요."
      : "     ⏭️  You can connect later with: lifekit connect google");
  }
  console.log("");

  // 8. Tailscale 원격 접속
  console.log(`  ${t.tailscaleStep}`);
  const tailscaleChoice: string = await new Select({
    name: "tailscale",
    message: isKo
      ? "스마트폰에서도 LifeKit을 사용하시겠어요?\n  Tailscale을 연동하면 집 밖에서도 스마트폰으로 LifeKit에 접속할 수 있어요.\n  (Tailscale 앱을 기기에 미리 설치해주세요)"
      : "Use LifeKit on your phone?\n  Tailscale lets you access LifeKit remotely from anywhere.\n  (Install the Tailscale app on your device first)",
    choices: isKo
      ? ["Tailscale 연동하기", "나중에 연동 (lifekit connect tailscale)"]
      : ["Connect Tailscale", "Later (lifekit connect tailscale)"],
  }).run();

  if (tailscaleChoice === "Tailscale 연동하기" || tailscaleChoice === "Connect Tailscale") {
    const proc = Bun.spawn(["bun", "run", "lifekit", "connect", "tailscale"], {
      cwd: PROJECT_ROOT,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });
    await proc.exited;
  } else {
    console.log(isKo
      ? "     ⏭️  나중에 lifekit connect tailscale 으로 연동할 수 있어요."
      : "     ⏭️  You can connect later with: lifekit connect tailscale");
  }
  console.log("");

  // 9. 회고 시간 설정
  console.log(`  ${t.reviewTime}`);
  const briefingTime: string = await new Input({
    name: "briefingTime",
    message: t.briefingPrompt,
    initial: "08:00",
  }).run();
  const reviewTime: string = await new Input({
    name: "reviewTime",
    message: t.reviewPrompt,
    initial: "22:00",
  }).run();

  // 주간 회고 요일 선택
  const dayChoices = isKo
    ? [
        { name: "0", message: "일요일 (권장) ★" },
        { name: "1", message: "월요일" },
        { name: "2", message: "화요일" },
        { name: "3", message: "수요일" },
        { name: "4", message: "목요일" },
        { name: "5", message: "금요일" },
        { name: "6", message: "토요일" },
      ]
    : [
        { name: "0", message: "Sunday (recommended) ★" },
        { name: "1", message: "Monday" },
        { name: "2", message: "Tuesday" },
        { name: "3", message: "Wednesday" },
        { name: "4", message: "Thursday" },
        { name: "5", message: "Friday" },
        { name: "6", message: "Saturday" },
      ];

  const weeklyReviewDayStr: string = await new Select({
    name: "weeklyReviewDay",
    message: isKo ? "주간 회고 요일 (일요일 권장)" : "Weekly review day (Sunday recommended)",
    choices: dayChoices,
  }).run();
  const weeklyReviewDay = parseInt(weeklyReviewDayStr, 10);

  const weeklyReviewTime: string = await new Input({
    name: "weeklyReviewTime",
    message: t.weeklyReviewPrompt,
    initial: "21:00",
  }).run();
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
    kits: selectedKitIds,
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
    weeklyReviewDay,
  });

  // .env 파일 저장 (packages/server/.env)
  if (envLines.length > 0) {
    saveEnvFile(envLines);
  }

  console.log("");

  // ── 완료 안내 ──
  console.log(`  ${t.done}
  ═══════════════════════════

  📦 ${t.startHint}
     bun run lifekit start

  🌐 ${isKo ? "접속" : "Access"}:
     ${isKo ? "로컬" : "Local"}:  http://localhost:5173

  🔗 ${t.connectHint}
     ${t.googleHint}    bun run lifekit connect google
     ${t.tailscaleHint} bun run lifekit connect tailscale

  📋 ${t.kitAddLater}

  🤖 ${t.onboardingHint}
     ${t.onboardingDesc}
  `);
}
