#!/usr/bin/env bun

import { initCommand } from "./commands/init";
import { connectCommand } from "./commands/connect";
import { startCommand } from "./commands/start";
import { statusCommand } from "./commands/status";
import { versionCommand } from "./commands/version";

const command = process.argv[2];

switch (command) {
  case "init":
    await initCommand();
    break;
  case "connect": {
    const service = process.argv[3];
    if (!service) {
      console.log("사용법: lifekit connect <google|tailscale>");
    } else {
      await connectCommand(service);
    }
    break;
  }
  case "start":
    await startCommand();
    break;
  case "status":
    await statusCommand();
    break;
  case "version":
    versionCommand();
    break;
  default:
    console.log(`
  🧰 LifeKit CLI v0.1.0

  Usage: lifekit <command>

  Commands:
    init      Initial setup (AI adapter, etc.)
    connect   Connect external services (google, tailscale)
    start     Start server + web dashboard
    status    Show server/web status and DB path
    version   Show version
    `);
    break;
}
