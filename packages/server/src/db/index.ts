import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { mkdirSync, existsSync } from "fs";

// Ensure data directory exists
if (!existsSync("data")) {
  mkdirSync("data", { recursive: true });
}

const sqlite = new Database("data/lifekit.db");

// Enable WAL + FK
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

// ── 자동 마이그레이션 (서버 시작 시 항상 실행) ──
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT,
    sort_order INTEGER DEFAULT 0, is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY, domain_id TEXT REFERENCES domains(id),
    name TEXT NOT NULL, icon TEXT, description TEXT, satisfaction INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, area_id TEXT REFERENCES areas(id),
    name TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'active', target_date TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id),
    area_id TEXT REFERENCES areas(id), title TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'P2', due_date TEXT, completed_at TEXT,
    is_routine INTEGER DEFAULT 0, routine_rule TEXT, tags TEXT, sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    start_at TEXT NOT NULL, end_at TEXT, all_day INTEGER DEFAULT 0, location TEXT,
    source TEXT DEFAULT 'manual', external_id TEXT,
    linked_task_id TEXT REFERENCES tasks(id), linked_project_id TEXT REFERENCES projects(id),
    color TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY, area_id TEXT REFERENCES areas(id),
    project_id TEXT REFERENCES projects(id), title TEXT, content TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY, provider TEXT NOT NULL, last_sync_at TEXT,
    sync_token TEXT, config TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS satisfaction_history (
    id TEXT PRIMARY KEY, area_id TEXT REFERENCES areas(id),
    score INTEGER NOT NULL, recorded_at TEXT DEFAULT (datetime('now')), note TEXT
  );
  CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id TEXT PRIMARY KEY, area_id TEXT NOT NULL REFERENCES areas(id),
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS onboarding_messages (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES onboarding_sessions(id),
    role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS area_onboarding_data (
    id TEXT PRIMARY KEY, area_id TEXT NOT NULL REFERENCES areas(id),
    level INTEGER, goal TEXT, custom_data TEXT, completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, nickname TEXT, relation_type TEXT,
    birthday TEXT, memo TEXT, last_met_at TEXT, meeting_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, date TEXT NOT NULL, date_end TEXT,
    status TEXT DEFAULT 'draft', diary TEXT, next_plan TEXT, meta TEXT, sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS area_xp (
    id TEXT PRIMARY KEY, area_id TEXT NOT NULL REFERENCES areas(id),
    xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS xp_events (
    id TEXT PRIMARY KEY, area_id TEXT NOT NULL REFERENCES areas(id),
    amount INTEGER NOT NULL, reason TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS area_kits (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id),
    kit_id TEXT NOT NULL,
    installed_at TEXT DEFAULT (datetime('now')),
    config TEXT
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),
    activity_type TEXT NOT NULL,
    date TEXT NOT NULL,
    duration_min INTEGER,
    calories INTEGER,
    avg_heart_rate INTEGER,
    intensity INTEGER,
    memo TEXT,
    extra_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS meal_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    food_name TEXT NOT NULL,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL,
    source TEXT DEFAULT 'manual',
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS fixed_expenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    billing_day INTEGER NOT NULL,
    category TEXT,
    domain_id TEXT REFERENCES domains(id),
    payment_method TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    expense_type TEXT,
    income_type TEXT,
    category TEXT,
    domain_id TEXT REFERENCES domains(id),
    payment_method TEXT,
    memo TEXT,
    fixed_expense_id TEXT REFERENCES fixed_expenses(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    avg_price REAL,
    current_price REAL,
    current_price_updated_at TEXT,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS investment_trades (
    id TEXT PRIMARY KEY,
    investment_id TEXT REFERENCES investments(id),
    trade_type TEXT NOT NULL,
    date TEXT NOT NULL,
    quantity REAL,
    price REAL,
    amount REAL,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS wardrobes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    color TEXT,
    style TEXT,
    purchase_date TEXT,
    price INTEGER,
    expense_id TEXT REFERENCES expenses(id),
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS learning_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    total_pages INTEGER,
    current_pages INTEGER,
    progress INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    rating INTEGER,
    review TEXT,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS culture_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    with_whom TEXT,
    rating INTEGER,
    review TEXT,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS hobby_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    status TEXT DEFAULT 'active',
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS hobby_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES hobby_projects(id),
    date TEXT NOT NULL,
    duration_min INTEGER,
    content TEXT,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_areas_domain ON areas(domain_id);
  CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_area ON tasks(area_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events(start_at);
  CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(type, date);
  CREATE INDEX IF NOT EXISTS idx_area_xp_area ON area_xp(area_id);
  CREATE INDEX IF NOT EXISTS idx_area_kits_area ON area_kits(area_id);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(date);
  CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(asset_type);
  CREATE INDEX IF NOT EXISTS idx_learning_logs_type ON learning_logs(type);
  CREATE INDEX IF NOT EXISTS idx_culture_logs_date ON culture_logs(date);
  CREATE INDEX IF NOT EXISTS idx_hobby_logs_project ON hobby_logs(project_id);
`);

// Safe column additions
const addCol = (table: string, col: string, type: string) => {
  try { sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch {}
};
addCol("calendar_events", "linked_domain_id", "TEXT REFERENCES domains(id)");
addCol("tasks", "estimated_minutes", "INTEGER");
addCol("tasks", "start_at", "TEXT");
addCol("tasks", "end_at", "TEXT");
addCol("tasks", "all_day", "INTEGER DEFAULT 0");
addCol("tasks", "location", "TEXT");
addCol("tasks", "source", "TEXT DEFAULT 'manual'");
addCol("tasks", "external_id", "TEXT");
addCol("tasks", "color", "TEXT");
addCol("tasks", "linked_domain_id", "TEXT REFERENCES domains(id)");
addCol("tasks", "relation_ids", "TEXT");
addCol("dashboard", "language", "TEXT DEFAULT 'ko'");

try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tasks_start_at ON tasks(start_at)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_id)"); } catch {}

export const db = drizzle(sqlite, { schema });
export { sqlite };
