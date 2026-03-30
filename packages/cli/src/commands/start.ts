import { resolve, join } from "path";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { homedir } from "os";

const ROOT = resolve(import.meta.dir, "../../../..");
const PLIST_LABEL = "ai.lifekit.server";
const PLIST_PATH = join(homedir(), "Library/LaunchAgents", `${PLIST_LABEL}.plist`);
const LOG_DIR = join(homedir(), ".lifekit/logs");
const LOG_OUT = join(LOG_DIR, "server-stdout.log");
const LOG_ERR = join(LOG_DIR, "server-stderr.log");

function getBunPath(): string {
  // bun의 실제 경로 찾기
  try {
    const proc = Bun.spawnSync(["which", "bun"], { stdout: "pipe" });
    const path = new TextDecoder().decode(proc.stdout).trim();
    if (path) return path;
  } catch {}
  return "/usr/local/bin/bun";
}

function generatePlist(): string {
  const bunPath = getBunPath();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${bunPath}</string>
        <string>run</string>
        <string>lifekit</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${ROOT}</string>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_OUT}</string>
    <key>StandardErrorPath</key>
    <string>${LOG_ERR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${resolve(homedir(), ".bun/bin")}</string>
    </dict>
</dict>
</plist>`;
}

export async function installDaemon(): Promise<void> {
  console.log("🔧 LaunchAgent 설정 중...\n");

  // 로그 디렉토리 생성
  const { mkdirSync } = await import("fs");
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  // 기존 plist 언로드 (있으면)
  if (existsSync(PLIST_PATH)) {
    try {
      Bun.spawnSync(["launchctl", "unload", PLIST_PATH], { stdout: "pipe", stderr: "pipe" });
    } catch {}
  }

  // plist 생성
  const plistContent = generatePlist();
  writeFileSync(PLIST_PATH, plistContent);
  console.log(`  📄 plist 생성: ${PLIST_PATH}`);

  // plist 로드
  const loadResult = Bun.spawnSync(["launchctl", "load", PLIST_PATH], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (loadResult.exitCode === 0) {
    console.log("  ✅ LaunchAgent 등록 완료!");
    console.log(`\n  📋 상태 확인: launchctl list | grep ${PLIST_LABEL}`);
    console.log(`  📋 로그 확인: tail -f ${LOG_OUT}`);
    console.log(`  📋 해제: launchctl unload ${PLIST_PATH}`);
  } else {
    const stderr = new TextDecoder().decode(loadResult.stderr);
    console.error(`  ❌ LaunchAgent 등록 실패: ${stderr}`);
  }
}

export async function uninstallDaemon(): Promise<void> {
  if (!existsSync(PLIST_PATH)) {
    console.log("  ⚠️  LaunchAgent가 설치되어 있지 않아요.");
    return;
  }

  try {
    Bun.spawnSync(["launchctl", "unload", PLIST_PATH], { stdout: "pipe", stderr: "pipe" });
  } catch {}

  unlinkSync(PLIST_PATH);
  console.log("  ✅ LaunchAgent 해제 및 삭제 완료!");
}

export async function startCommand(args?: string[]) {
  const isDaemon = args?.includes("--daemon");
  const isUninstall = args?.includes("--uninstall-daemon");

  if (isUninstall) {
    await uninstallDaemon();
    return;
  }

  if (isDaemon) {
    await installDaemon();
    return;
  }

  // 일반 시작 모드
  console.log("🧰 LifeKit starting...\n");

  const serverDir = resolve(ROOT, "packages/server");
  const webDir = resolve(ROOT, "packages/web");

  console.log("  📦 Server  → http://localhost:4000");
  console.log("  🌐 Web     → http://localhost:5173\n");

  const server = Bun.spawn(["bun", "run", "dev"], {
    cwd: serverDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const web = Bun.spawn(["bun", "run", "dev"], {
    cwd: webDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const cleanup = () => {
    console.log("\n🛑 Shutting down LifeKit...");
    server.kill();
    web.kill();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Wait for both processes
  await Promise.all([server.exited, web.exited]);
}
