import { Hono } from "hono";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_FILE = join(import.meta.dir, "../../data/settings.json");

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
    language: "ko",
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

export const settingsRoutes = new Hono();

// GET /api/settings
settingsRoutes.get("/", (c) => {
  return c.json(loadSettings());
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
