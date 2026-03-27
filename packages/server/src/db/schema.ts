import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ========== Domain ==========
export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isSystem: integer("is_system", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Area ==========
export const areas = sqliteTable("areas", {
  id: text("id").primaryKey(),
  domainId: text("domain_id").references(() => domains.id),
  name: text("name").notNull(),
  icon: text("icon"),
  description: text("description"),
  satisfaction: integer("satisfaction"), // 1~10 (Wheel of Life)
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Project ==========
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"), // active/paused/completed/archived
  targetDate: text("target_date"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Task ==========
// 태스크 = 이벤트 (모든 것은 태스크)
// startAt이 null이면 backlog, 있으면 캘린더 이벤트
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  areaId: text("area_id").references(() => areas.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo"), // todo/in_progress/done/cancelled
  priority: text("priority").default("P2"), // P1/P2/P3
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  isRoutine: integer("is_routine", { mode: "boolean" }).default(false),
  routineRule: text("routine_rule"), // RRULE
  tags: text("tags"), // JSON array
  estimatedMinutes: integer("estimated_minutes"),
  sortOrder: integer("sort_order").default(0),
  // Calendar fields (null startAt = backlog)
  startAt: text("start_at"),
  endAt: text("end_at"),
  allDay: integer("all_day", { mode: "boolean" }).default(false),
  location: text("location"),
  source: text("source").default("manual"), // manual | google
  externalId: text("external_id"),
  color: text("color"),
  linkedDomainId: text("linked_domain_id").references(() => domains.id),
  relationIds: text("relation_ids"), // JSON array of relation ids
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Calendar Event ==========
export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startAt: text("start_at").notNull(),
  endAt: text("end_at"),
  allDay: integer("all_day", { mode: "boolean" }).default(false),
  location: text("location"),
  source: text("source").default("manual"), // manual/google/apple
  externalId: text("external_id"),
  linkedTaskId: text("linked_task_id").references(() => tasks.id),
  linkedProjectId: text("linked_project_id").references(() => projects.id),
  linkedDomainId: text("linked_domain_id").references(() => domains.id),
  color: text("color"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Note (Resources) ==========
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id),
  projectId: text("project_id").references(() => projects.id),
  title: text("title"),
  content: text("content"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Sync State ==========
export const syncState = sqliteTable("sync_state", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  lastSyncAt: text("last_sync_at"),
  syncToken: text("sync_token"),
  config: text("config"), // JSON
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Satisfaction History (Wheel of Life) ==========
export const satisfactionHistory = sqliteTable("satisfaction_history", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id),
  score: integer("score").notNull(), // 1~10
  recordedAt: text("recorded_at").default("CURRENT_TIMESTAMP"),
  note: text("note"),
});

// ========== Onboarding Sessions ==========
export const onboardingSessions = sqliteTable("onboarding_sessions", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id).notNull(),
  status: text("status").default("active"), // active/complete
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Onboarding Messages ==========
export const onboardingMessages = sqliteTable("onboarding_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => onboardingSessions.id).notNull(),
  role: text("role").notNull(), // user/assistant/system
  content: text("content").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Area Onboarding Data ==========
export const areaOnboardingData = sqliteTable("area_onboarding_data", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id).notNull(),
  level: integer("level"),
  goal: text("goal"),
  customData: text("custom_data"), // JSON
  completedAt: text("completed_at"),
});

// ========== Relations (인간관계) ==========
export const relations = sqliteTable("relations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  relationType: text("relation_type"), // 연인/친구/가족/비즈니스
  birthday: text("birthday"),
  memo: text("memo"),
  lastMetAt: text("last_met_at"),
  meetingCount: integer("meeting_count").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Area XP ==========
export const areaXp = sqliteTable("area_xp", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id).notNull(),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== XP Events ==========
export const xpEvents = sqliteTable("xp_events", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id).notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Reports (일일/주간 리포트) ==========
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // daily | weekly
  date: text("date").notNull(), // 일일: YYYY-MM-DD, 주간: 주 시작일(월요일)
  dateEnd: text("date_end"), // 주간: 주 종료일(일요일)
  status: text("status").default("draft"), // draft | sent
  diary: text("diary"), // 일기/회고 내용
  nextPlan: text("next_plan"), // 다음 주 계획 (주간만)
  meta: text("meta"), // JSON: 태스크 스냅샷, 밸런스 데이터
  sentAt: text("sent_at"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});
