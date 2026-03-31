import { Hono } from "hono";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_FILE = join(import.meta.dir, "../../data/settings.json");
const ENV_FILE = join(import.meta.dir, "../../.env");

export interface Settings {
  profile: {
    name: string;
    birthDate: string;
    timezone: string;
    mbti: string;
  };
  routine: {
    briefingTime: string;
    reviewTime: string;
    weeklyReviewTime: string;
    weeklyReviewDay: number;
  };
  ai: {
    provider: "anthropic" | "ollama";
    apiKey: string;
    model: string;
  };
  googleCalendar: {
    connected: boolean;
    syncIntervalMin: number;
  };
  notifications: {
    briefing: boolean;
    review: boolean;
    taskReminder: boolean;
  };
  dashboard: {
    defaultPage: string;
    theme: "light" | "dark" | "system";
    language: "ko" | "en";
  };
}

const DEFAULT_SETTINGS: Settings = {
  profile: {
    name: "",
    birthDate: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    mbti: "",
  },
  routine: {
    briefingTime: "08:00",
    reviewTime: "22:00",
    weeklyReviewTime: "21:00",
    weeklyReviewDay: 0,
  },
  ai: {
    provider: "anthropic",
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
    theme: "light",
    language: "en",
  },
};

function loadSettings(): Settings {
  if (!existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: Settings) {
  const dir = join(SETTINGS_FILE, "..");
  if (!existsSync(dir)) {
    const { mkdirSync } = require("fs");
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/** Parse a .env file into key-value pairs */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  try {
    const content = readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

export interface AiStatus {
  configured: boolean;
  connected: boolean;
  adapter: string | null;
  gatewayUrl: string | null;
}

/** Check AI connection configuration and actual connectivity */
async function checkAiStatus(): Promise<AiStatus> {
  // Check env vars (process.env first, then .env file)
  const envFile = parseEnvFile(ENV_FILE);
  const adapter = process.env.LIFEKIT_AI_ADAPTER || envFile.LIFEKIT_AI_ADAPTER || null;
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || envFile.OPENCLAW_GATEWAY_URL || null;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || envFile.OPENCLAW_GATEWAY_TOKEN || null;

  // Not configured if no adapter is set
  if (!adapter) {
    return { configured: false, connected: false, adapter: null, gatewayUrl: null };
  }

  // For openclaw adapter, check gateway connectivity via /v1/models
  if (adapter === "openclaw" && gatewayUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${gatewayUrl}/v1/models`, {
        signal: controller.signal,
        headers: gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {},
      });
      clearTimeout(timeout);
      return {
        configured: true,
        connected: res.ok,
        adapter,
        gatewayUrl,
      };
    } catch {
      return { configured: true, connected: false, adapter, gatewayUrl };
    }
  }

  // Other adapters: configured but can't verify connectivity
  return { configured: true, connected: false, adapter, gatewayUrl };
}

export const settingsRoutes = new Hono();

// GET /api/settings
settingsRoutes.get("/", (c) => {
  return c.json(loadSettings());
});

// GET /api/settings/ai-status
settingsRoutes.get("/ai-status", async (c) => {
  const status = await checkAiStatus();
  return c.json(status);
});

// DELETE /api/settings/reset — 설정 초기화
settingsRoutes.delete("/reset", (c) => {
  saveSettings({ ...DEFAULT_SETTINGS });
  return c.json({ ok: true });
});

// PATCH /api/settings — deep merge
settingsRoutes.patch("/", async (c) => {
  const body = await c.req.json();
  const current = loadSettings();

  // shallow merge each section
  for (const key of Object.keys(body)) {
    if (key in current && typeof body[key] === "object" && !Array.isArray(body[key])) {
      (current as any)[key] = { ...(current as any)[key], ...body[key] };
    } else {
      (current as any)[key] = body[key];
    }
  }

  saveSettings(current);
  return c.json(current);
});
