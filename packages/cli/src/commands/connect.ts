import { resolve } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";

const LIFEKIT_DIR = resolve(homedir(), ".lifekit");
const CONFIG_PATH = resolve(LIFEKIT_DIR, "config.json");
const ENV_PATH = resolve(LIFEKIT_DIR, ".env");
const GWS_CONFIG_DIR = resolve(homedir(), ".config/gws");
const GWS_CLIENT_SECRET_PATH = resolve(GWS_CONFIG_DIR, "client_secret.json");
const GWS_BIN = resolve(homedir(), ".npm-global/bin/gws");

function prompt(question: string): string {
  process.stdout.write(question);
  const buf = Buffer.alloc(1024);
  const fd = require("fs").openSync("/dev/stdin", "rs");
  const n = require("fs").readSync(fd, buf, 0, buf.length, null);
  require("fs").closeSync(fd);
  return buf.toString("utf8", 0, n).trim();
}

async function runCommand(cmd: string, args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), exitCode };
}

async function runInteractive(cmd: string, args: string[]): Promise<number> {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  return proc.exited;
}

function loadConfig(): Record<string, any> {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(config: Record<string, any>) {
  if (!existsSync(LIFEKIT_DIR)) {
    mkdirSync(LIFEKIT_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function appendEnv(lines: string[]) {
  if (!existsSync(LIFEKIT_DIR)) {
    mkdirSync(LIFEKIT_DIR, { recursive: true });
  }
  let existing = "";
  if (existsSync(ENV_PATH)) {
    existing = readFileSync(ENV_PATH, "utf-8");
  }
  // Replace existing keys or append new ones
  for (const line of lines) {
    const key = line.split("=")[0];
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(existing)) {
      existing = existing.replace(regex, line);
    } else {
      existing += (existing.endsWith("\n") || existing === "" ? "" : "\n") + line + "\n";
    }
  }
  writeFileSync(ENV_PATH, existing);
}

// ── connect google ──
async function connectGoogle() {
  console.log(`
🔗 구글 캘린더 연동

구글 캘린더를 연동하려면 구글 클라우드 콘솔에서
OAuth 앱을 만들어야 합니다. (무료, 5분 소요)

📋 단계별 안내:

1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 (또는 기존 프로젝트 선택)
3. 왼쪽 메뉴 → API 및 서비스 → 사용자 인증 정보
4. [사용자 인증 정보 만들기] → OAuth 클라이언트 ID
5. 애플리케이션 유형: 데스크톱 앱
6. 이름: LifeKit (아무 이름이나 OK)
7. 생성 후 client_id와 client_secret 복사

8. 왼쪽 메뉴 → API 및 서비스 → 라이브러리
9. "Google Calendar API" 검색 → 사용 설정
`);

  const enterAnswer = prompt("Enter를 눌러 브라우저를 열거나 직접 방문하세요: ");
  // Open browser
  Bun.spawn(["open", "https://console.cloud.google.com"], { stdout: "ignore", stderr: "ignore" });

  console.log("");
  const clientId = prompt("Client ID: ");
  if (!clientId) {
    console.log("\n⚠️  Client ID가 입력되지 않았습니다. 다시 시도해주세요.");
    return;
  }

  const clientSecret = prompt("Client Secret: ");
  if (!clientSecret) {
    console.log("\n⚠️  Client Secret이 입력되지 않았습니다. 다시 시도해주세요.");
    return;
  }

  // Save ~/.config/gws/client_secret.json
  if (!existsSync(GWS_CONFIG_DIR)) {
    mkdirSync(GWS_CONFIG_DIR, { recursive: true });
  }

  const clientSecretJson = {
    installed: {
      client_id: clientId,
      client_secret: clientSecret,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      redirect_uris: ["http://localhost"],
    },
  };
  writeFileSync(GWS_CLIENT_SECRET_PATH, JSON.stringify(clientSecretJson, null, 2));
  console.log(`\n💾 OAuth 설정 저장: ${GWS_CLIENT_SECRET_PATH}`);

  // Save to ~/.lifekit/.env
  appendEnv([
    `GOOGLE_WORKSPACE_CLI_CLIENT_ID=${clientId}`,
    `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET=${clientSecret}`,
  ]);
  console.log(`💾 환경변수 저장: ${ENV_PATH}`);

  // Run gws auth login
  console.log("\n🔐 구글 계정 인증 중... (브라우저가 열립니다)");
  console.log("브라우저에서 인증 완료 후 자동으로 진행됩니다.\n");

  const authExit = await runInteractive(GWS_BIN, ["auth", "login"]);

  if (authExit !== 0) {
    // Double check
    const check = await runCommand(GWS_BIN, ["calendar", "calendarList", "list", "--params", '{"maxResults":1}']);
    if (check.exitCode !== 0) {
      console.log("\n⚠️  구글 인증에 실패했어요. 다시 시도해주세요.");
      return;
    }
  }

  // Update config
  const config = loadConfig();
  config.googleCalendar = { connected: true };
  saveConfig(config);

  console.log("\n✅ 구글 캘린더 연동 완료! lifekit start 후 자동 동기화됩니다.");
}

// ── connect tailscale ──
async function connectTailscale() {
  // Check if tailscale is installed
  const tsResult = await runCommand("tailscale", ["ip", "-4"]);

  if (tsResult.exitCode !== 0) {
    console.log(`
🔗 Tailscale 원격 접속 설정

Tailscale을 사용하면 어디서든 모바일로 LifeKit에 접속할 수 있습니다.

📋 설치 방법:
1. https://tailscale.com/download 에서 설치
2. tailscale up 실행 후 로그인
3. 완료 후 다시 lifekit connect tailscale 실행
`);
    return;
  }

  const ip = tsResult.stdout.trim();

  // Save to config
  const config = loadConfig();
  config.tailscaleIp = ip;
  saveConfig(config);

  console.log(`
✅ Tailscale 연결됨! 모바일에서 http://${ip}:5173 접속 가능
홈 화면에 추가하면 앱처럼 사용할 수 있어요 📱
`);
}

// ── main ──
export async function connectCommand(service: string) {
  switch (service) {
    case "google":
      await connectGoogle();
      break;
    case "tailscale":
      await connectTailscale();
      break;
    default:
      console.log(`알 수 없는 서비스: ${service}`);
      console.log("사용법: lifekit connect <google|tailscale>");
      break;
  }
}
