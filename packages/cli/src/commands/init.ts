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
    language: "en" as const,
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

// ── Kit 설치 (서버 API 호출) ──
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

// ── AI 연결 테스트 (OpenClaw only) ──
async function testAiConnection(language: string): Promise<{ envLines: string[] }> {
  const isKo = language === "ko";
  const envLines: string[] = [];

  console.log(isKo ? "\n  🔗 OpenClaw 연결 설정" : "\n  🔗 OpenClaw Connection Setup");
  console.log(isKo
    ? "     OpenClaw 게이트웨이에 연결합니다."
    : "     Connecting to OpenClaw gateway.");

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

// ── 서버 시작/재시작 ──
async function ensureServerRunning(isKo: boolean): Promise<void> {
  // 기존 서버 프로세스 확인 및 종료
  try {
    const lsof = Bun.spawnSync(["lsof", "-ti", ":4000"], { stdout: "pipe" });
    const pids = new TextDecoder().decode(lsof.stdout).trim();
    if (pids) {
      console.log(isKo
        ? "     🔄 기존 서버 프로세스 종료 중..."
        : "     🔄 Stopping existing server...");
      for (const pid of pids.split("\n")) {
        try { process.kill(parseInt(pid), "SIGTERM"); } catch {}
      }
      // 잠깐 대기
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch {}
}

// ── 메인 init 커맨드 ──
// 다국어 텍스트
const T = {
  ko: {
    title: "🧰 LifeKit 초기 설정",
    envCheck: "1️⃣  환경 확인",
    aiAdapter: "2️⃣  AI 연결 설정",
    reviewTime: "3️⃣  브리핑/회고 시간 설정",
    weeklyReview: "4️⃣  주간 회고 요일 선택",
    autoStart: "5️⃣  서버 자동 실행 설정",
    googleCalStep: "6️⃣  구글 캘린더 연동",
    tailscaleStep: "7️⃣  원격 접속 (Tailscale)",
    kitSelect: "8️⃣  Kit 선택 + 설치",
    kitNone: "Kit이 없어요",
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
    aiAdapter: "2️⃣  AI Connection",
    reviewTime: "3️⃣  Briefing/Review Schedule",
    weeklyReview: "4️⃣  Weekly Review Day",
    autoStart: "5️⃣  Auto-start Setup",
    googleCalStep: "6️⃣  Google Calendar",
    tailscaleStep: "7️⃣  Remote Access (Tailscale)",
    kitSelect: "8️⃣  Kit Selection + Install",
    kitNone: "No kits found",
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
  // ── 1. 언어 선택 ──
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

  // 환경 체크
  console.log(`  ${t.envCheck}`);
  const bunVersion = Bun.version;
  console.log(`     Bun: v${bunVersion} ✅`);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`     ${isKo ? "타임존" : "Timezone"}: ${timezone} ✅`);
  console.log("");

  // 데이터 디렉토리 생성
  const dataDir = "~/.lifekit/";
  const resolvedDataDir = dataDir.replace("~", homedir());
  if (!existsSync(resolvedDataDir)) {
    mkdirSync(resolvedDataDir, { recursive: true });
  }

  // ── 2. AI 어댑터 설정 (OpenClaw only) → .env 저장 ──
  console.log(`  ${t.aiAdapter}`);
  const aiResult = await testAiConnection(language);
  const envLines = aiResult.envLines;

  // .env 파일 즉시 저장
  if (envLines.length > 0) {
    saveEnvFile(envLines);
  }
  console.log("");

  // ── 3. 브리핑/회고 시간 설정 ──
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
  console.log("");

  // ── 4. 주간 회고 요일 선택 ──
  console.log(`  ${t.weeklyReview}`);
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

  // ── 저장: config.json + settings.json ──
  const name = ""; // 에이전트 연결 후 온보딩 시 설정

  if (!existsSync(LIFEKIT_DIR)) {
    mkdirSync(LIFEKIT_DIR, { recursive: true });
  }

  const config: Record<string, any> = {
    name,
    language,
    timezone,
    dataDir,
    adapter: "openclaw",
    kits: [],
    createdAt: new Date().toISOString(),
  };

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`  💾 설정 저장: ${CONFIG_PATH}`);

  saveSettingsJson({
    name,
    timezone,
    language,
    briefingTime,
    reviewTime,
    weeklyReviewTime,
    weeklyReviewDay,
  });
  console.log("");

  // ── 5. 서버 자동 실행 설정 → LaunchAgent 등록 + 서버 시작/재시작 ──
  console.log(`  ${t.autoStart}`);
  const autoStartChoice: string = await new Select({
    name: "autoStart",
    message: isKo
      ? "서버를 자동으로 실행할까요?\n  컴퓨터 시작 시 LifeKit 서버가 자동으로 켜져요."
      : "Auto-start server?\n  LifeKit server will start automatically when your computer boots.",
    choices: isKo
      ? ["자동 실행 (권장)", "수동 실행 (bun run lifekit start)"]
      : ["Auto-start (recommended)", "Manual (bun run lifekit start)"],
  }).run();

  const wantsAutoStart = autoStartChoice.includes("자동") || autoStartChoice.includes("Auto");

  if (wantsAutoStart) {
    try {
      // 기존 서버 프로세스 종료 후 재시작 (새 .env 반영)
      await ensureServerRunning(isKo);
      const { installDaemon } = await import("./start");
      await installDaemon();
      console.log(isKo
        ? "\n  ✅ 서버가 백그라운드에서 실행 중입니다!"
        : "\n  ✅ Server is running in the background!");
    } catch (err: any) {
      console.error(isKo
        ? `\n  ⚠️  LaunchAgent 설정 실패: ${err.message}`
        : `\n  ⚠️  LaunchAgent setup failed: ${err.message}`);
      console.log(isKo
        ? "     수동으로 실행해주세요: bun run lifekit start"
        : "     Please start manually: bun run lifekit start");
    }
  } else {
    // 수동 모드에서도 기존 서버 있으면 재시작 (새 .env 반영)
    await ensureServerRunning(isKo);
    console.log(isKo
      ? "     ⏭️  수동으로 실행해주세요: bun run lifekit start"
      : "     ⏭️  Please start manually: bun run lifekit start");
  }

  // 서버 시작 대기 (LaunchAgent load 후 잠시 기다림)
  if (wantsAutoStart) {
    console.log(isKo ? "     ⏳ 서버 시작 대기 중..." : "     ⏳ Waiting for server...");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const res = await fetch("http://localhost:4000/api/health", { signal: AbortSignal.timeout(1000) });
        if (res.ok) {
          console.log(isKo ? "     ✅ 서버 준비 완료!" : "     ✅ Server ready!");
          break;
        }
      } catch {}
    }
  }
  console.log("");

  // ── 6. 구글 캘린더 연동 (skip 가능, 서버 켜진 후) ──
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

  // ── 7. Tailscale 연동 (skip 가능, 서버 켜진 후) ──
  console.log(`  ${t.tailscaleStep}`);
  const tailscaleChoice: string = await new Select({
    name: "tailscale",
    message: isKo
      ? `📱 스마트폰에서도 LifeKit을 사용하시겠어요?\n\n  Tailscale을 사용하면 집 밖에서도 스마트폰으로 LifeKit에 접속할 수 있어요.\n\n  작동 방식:\n  • 이 컴퓨터에서 서버를 실행 (bun run lifekit start)\n  • 스마트폰에 Tailscale 앱 설치 후 같은 계정으로 로그인\n  • 스마트폰 브라우저에서 Tailscale IP로 접속`
      : `📱 Use LifeKit on your phone?\n\n  Tailscale lets you access LifeKit remotely from anywhere.\n\n  How it works:\n  • Run the server on this computer (bun run lifekit start)\n  • Install Tailscale app on your phone and log in with the same account\n  • Open the Tailscale IP in your phone's browser`,
    choices: isKo
      ? ["Tailscale 연동하기", "나중에 연동 (lifekit connect tailscale)"]
      : ["Connect Tailscale", "Later (lifekit connect tailscale)"],
  }).run();

  if (tailscaleChoice === "Tailscale 연동하기" || tailscaleChoice === "Connect Tailscale") {
    console.log(isKo
      ? "\n     🔍 Tailscale IP 확인 중..."
      : "\n     🔍 Checking Tailscale IP...");

    let tailscaleIp = "";
    try {
      const tsProc = Bun.spawn(["tailscale", "ip", "-4"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const tsOutput = await new Response(tsProc.stdout).text();
      await tsProc.exited;
      if (tsProc.exitCode === 0 && tsOutput.trim()) {
        tailscaleIp = tsOutput.trim();
      }
    } catch {}

    if (tailscaleIp) {
      console.log(`     ✅ Tailscale IP: ${tailscaleIp}`);

      const configPath = resolve(homedir(), ".lifekit", "config.json");
      try {
        let cfg: Record<string, any> = {};
        if (existsSync(configPath)) {
          cfg = JSON.parse(readFileSync(configPath, "utf-8"));
        }
        cfg.tailscaleIp = tailscaleIp;
        writeFileSync(configPath, JSON.stringify(cfg, null, 2));
      } catch {}

      const accessUrl = `http://${tailscaleIp}:5173`;
      console.log(isKo
        ? `
     ✅ Tailscale 설정 완료!

     📱 스마트폰 접속 준비:
     1. 스마트폰에 Tailscale 앱 설치 (App Store / Google Play)
     2. 같은 Tailscale 계정으로 로그인
     3. 서버 시작: bun run lifekit start
     4. 스마트폰 브라우저에서: ${accessUrl}

     💡 홈 화면에 추가하면 앱처럼 사용할 수 있어요!`
        : `
     ✅ Tailscale setup complete!

     📱 Phone access steps:
     1. Install Tailscale app (App Store / Google Play)
     2. Log in with the same Tailscale account
     3. Start server: bun run lifekit start
     4. Open on your phone: ${accessUrl}

     💡 Add to home screen for an app-like experience!`);
    } else {
      console.log(isKo
        ? `
     ⚠️  Tailscale이 설치되지 않았거나 로그인되지 않았어요.

     📋 설치 방법:
     1. https://tailscale.com/download 에서 설치
     2. tailscale up 실행 후 로그인
     3. 완료 후 다시 실행: bun run lifekit connect tailscale`
        : `
     ⚠️  Tailscale is not installed or not logged in.

     📋 Setup:
     1. Install from https://tailscale.com/download
     2. Run tailscale up and log in
     3. Then run: bun run lifekit connect tailscale`);
    }
  } else {
    console.log(isKo
      ? "     ⏭️  나중에 lifekit connect tailscale 으로 연동할 수 있어요."
      : "     ⏭️  You can connect later with: lifekit connect tailscale");
  }
  console.log("");

  // ── 8. Kit 선택 + 설치 (서버 API 호출, skip 가능) ──
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

    // config.json에 kits 업데이트
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      cfg.kits = selectedKitIds;
      writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    } catch {}
  } else {
    console.log(`  ${t.kitNone}`);
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
