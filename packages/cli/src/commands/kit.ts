const API_BASE = "http://localhost:4000/api";

export async function kitCommand(subcommand?: string, kitId?: string) {
  switch (subcommand) {
    case "list":
      await kitList();
      break;
    case "install":
      if (!kitId) {
        console.log("사용법: lifekit kit install <kitId>");
        return;
      }
      await kitInstall(kitId);
      break;
    case "uninstall":
      if (!kitId) {
        console.log("사용법: lifekit kit uninstall <kitId>");
        return;
      }
      await kitUninstall(kitId);
      break;
    case "update":
      if (!kitId) {
        console.log("사용법: lifekit kit update <kitId>");
        return;
      }
      await kitUpdate(kitId);
      break;
    default:
      console.log(`
  사용법: lifekit kit <command> [kitId]

  Commands:
    list                설치 가능한 Kit 목록
    install <kitId>     Kit 설치
    uninstall <kitId>   Kit 제거
    update <kitId>      Kit 업데이트
      `);
      break;
  }
}

async function kitList() {
  try {
    const res = await fetch(`${API_BASE}/kits`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const kits = await res.json();

    console.log("\n  === LifeKit Kits ===\n");
    for (const kit of kits) {
      const status = kit.installed ? "\x1b[32m[installed]\x1b[0m" : "\x1b[90m[available]\x1b[0m";
      console.log(`  ${status} ${kit.id} — ${kit.name} (${kit.nameEn})`);
      console.log(`           ${kit.description}`);
    }
    console.log();
  } catch (err: any) {
    console.error("서버에 연결할 수 없습니다. lifekit start를 먼저 실행하세요.");
  }
}

async function kitInstall(kitId: string) {
  try {
    const res = await fetch(`${API_BASE}/kits/${kitId}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (res.status === 404) {
      console.log(`Kit '${kitId}'를 찾을 수 없습니다.`);
      return;
    }
    if (res.status === 409) {
      console.log(`Kit '${kitId}'는 이미 설치되어 있습니다.`);
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    console.log(`Kit '${kitId}' 설치 완료! (${data.installedAt})`);
  } catch (err: any) {
    console.error("서버에 연결할 수 없습니다. lifekit start를 먼저 실행하세요.");
  }
}

async function kitUninstall(kitId: string) {
  try {
    const res = await fetch(`${API_BASE}/kits/${kitId}/uninstall`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    console.log(`Kit '${kitId}' 제거 완료.`);
  } catch (err: any) {
    console.error("서버에 연결할 수 없습니다. lifekit start를 먼저 실행하세요.");
  }
}

async function kitUpdate(kitId: string) {
  try {
    // 현재는 제거 후 재설치
    const uninstallRes = await fetch(`${API_BASE}/kits/${kitId}/uninstall`, {
      method: "DELETE",
    });
    if (!uninstallRes.ok) throw new Error(`HTTP ${uninstallRes.status}`);

    const installRes = await fetch(`${API_BASE}/kits/${kitId}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!installRes.ok) throw new Error(`HTTP ${installRes.status}`);

    console.log(`Kit '${kitId}' 업데이트 완료.`);
  } catch (err: any) {
    console.error("서버에 연결할 수 없습니다. lifekit start를 먼저 실행하세요.");
  }
}
