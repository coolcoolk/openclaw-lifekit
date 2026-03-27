import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";

// Ensure data directory exists
if (!existsSync("data")) {
  mkdirSync("data", { recursive: true });
}

const sqlite = new Database("data/lifekit.db");

// Enable WAL + FK
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

console.log("🔄 Running migrations...");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    domain_id TEXT REFERENCES domains(id),
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    satisfaction INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    target_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    area_id TEXT REFERENCES areas(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'P2',
    due_date TEXT,
    completed_at TEXT,
    is_routine INTEGER DEFAULT 0,
    routine_rule TEXT,
    tags TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_at TEXT NOT NULL,
    end_at TEXT,
    all_day INTEGER DEFAULT 0,
    location TEXT,
    source TEXT DEFAULT 'manual',
    external_id TEXT,
    linked_task_id TEXT REFERENCES tasks(id),
    linked_project_id TEXT REFERENCES projects(id),
    color TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),
    project_id TEXT REFERENCES projects(id),
    title TEXT,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    last_sync_at TEXT,
    sync_token TEXT,
    config TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS satisfaction_history (
    id TEXT PRIMARY KEY,
    area_id TEXT REFERENCES areas(id),
    score INTEGER NOT NULL,
    recorded_at TEXT DEFAULT (datetime('now')),
    note TEXT
  );

  -- Add linked_domain_id to calendar_events (safe ALTER — ignore if already exists)

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_areas_domain ON areas(domain_id);
  CREATE INDEX IF NOT EXISTS idx_projects_area ON projects(area_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_area ON tasks(area_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events(start_at);
  CREATE INDEX IF NOT EXISTS idx_events_external ON calendar_events(external_id);
  CREATE INDEX IF NOT EXISTS idx_satisfaction_area ON satisfaction_history(area_id);

  -- Onboarding tables
  CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id),
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS onboarding_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES onboarding_sessions(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS area_onboarding_data (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id),
    level INTEGER,
    goal TEXT,
    custom_data TEXT,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_area ON onboarding_sessions(area_id);
  CREATE INDEX IF NOT EXISTS idx_onboarding_messages_session ON onboarding_messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_area_onboarding_data_area ON area_onboarding_data(area_id);

  -- Relations (인간관계)
  CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT,
    relation_type TEXT,
    birthday TEXT,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Reports (일일/주간 리포트)
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    date_end TEXT,
    status TEXT DEFAULT 'draft',
    diary TEXT,
    next_plan TEXT,
    meta TEXT,
    sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(type, date);
`);

// Safe column additions (ALTER TABLE IF NOT EXISTS not supported in SQLite)
const addColumnIfNotExists = (table: string, column: string, type: string) => {
  try {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`  + Added ${table}.${column}`);
  } catch {
    // Column already exists — ignore
  }
};

addColumnIfNotExists("calendar_events", "linked_domain_id", "TEXT REFERENCES domains(id)");
addColumnIfNotExists("tasks", "estimated_minutes", "INTEGER");

// Tasks-Calendar 통합: tasks 테이블에 캘린더 필드 추가
addColumnIfNotExists("tasks", "start_at", "TEXT");
addColumnIfNotExists("tasks", "end_at", "TEXT");
addColumnIfNotExists("tasks", "all_day", "INTEGER DEFAULT 0");
addColumnIfNotExists("tasks", "location", "TEXT");
addColumnIfNotExists("tasks", "source", "TEXT DEFAULT 'manual'");
addColumnIfNotExists("tasks", "external_id", "TEXT");
addColumnIfNotExists("tasks", "color", "TEXT");
addColumnIfNotExists("tasks", "linked_domain_id", "TEXT REFERENCES domains(id)");
addColumnIfNotExists("tasks", "relation_ids", "TEXT");

// Relations: lastMetAt, meetingCount 추가
addColumnIfNotExists("relations", "last_met_at", "TEXT");
addColumnIfNotExists("relations", "meeting_count", "INTEGER DEFAULT 0");

// Area XP 테이블
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS area_xp (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id),
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS xp_events (
    id TEXT PRIMARY KEY,
    area_id TEXT NOT NULL REFERENCES areas(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_area_xp_area ON area_xp(area_id);
  CREATE INDEX IF NOT EXISTS idx_xp_events_area ON xp_events(area_id);
`);

// 인덱스 추가
try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tasks_start_at ON tasks(start_at)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_id)"); } catch {}
try { sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source)"); } catch {}

// calendar_events → tasks 데이터 마이그레이션 (아직 마이그레이션 안 된 것만)
try {
  const unmigrated = sqlite.query<{ cnt: number }, []>(
    "SELECT COUNT(*) as cnt FROM calendar_events WHERE id NOT IN (SELECT id FROM tasks)"
  ).get();

  if (unmigrated && unmigrated.cnt > 0) {
    sqlite.exec(`
      INSERT OR IGNORE INTO tasks (id, title, description, start_at, end_at, all_day, location, source, external_id, color, linked_domain_id, status, created_at, updated_at)
      SELECT id, title, description, start_at, end_at, all_day, location, source, external_id, color, linked_domain_id, 'todo', created_at, updated_at
      FROM calendar_events
    `);
    console.log(`  ✅ Migrated ${unmigrated.cnt} calendar_events → tasks`);
  }
} catch (err: any) {
  // calendar_events 테이블이 없거나 기타 오류 → 무시
}

console.log("✅ Migration complete!");
sqlite.close();
