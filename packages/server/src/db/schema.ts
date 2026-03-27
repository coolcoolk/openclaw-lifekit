import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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

// ========== Area Kits (Kit 설치 상태) ==========
export const areaKits = sqliteTable("area_kits", {
  id: text("id").primaryKey(),
  areaId: text("area_id").notNull().references(() => areas.id),
  kitId: text("kit_id").notNull(),
  installedAt: text("installed_at").default("CURRENT_TIMESTAMP"),
  config: text("config"), // JSON (Kit별 설정값)
});

// ========== Activity Logs (활동 기록 Kit) ==========
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  areaId: text("area_id").references(() => areas.id),
  activityType: text("activity_type").notNull(),
  date: text("date").notNull(),
  durationMin: integer("duration_min"),
  calories: integer("calories"),
  avgHeartRate: integer("avg_heart_rate"),
  intensity: integer("intensity"),
  memo: text("memo"),
  extraData: text("extra_data"), // JSON
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Activity Types (커스텀 활동 유형) ==========
export const activityTypes = sqliteTable("activity_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Meal Logs (식습관 Kit) ==========
export const mealLogs = sqliteTable("meal_logs", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(),
  foodName: text("food_name").notNull(),
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  source: text("source").default("manual"),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Fixed Expenses (고정비) ==========
export const fixedExpenses = sqliteTable("fixed_expenses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  billingDay: integer("billing_day").notNull(),
  category: text("category"),
  domainId: text("domain_id").references(() => domains.id),
  paymentMethod: text("payment_method"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Expenses (가계부) ==========
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // expense/income
  expenseType: text("expense_type"),
  incomeType: text("income_type"),
  category: text("category"),
  domainId: text("domain_id").references(() => domains.id),
  paymentMethod: text("payment_method"),
  memo: text("memo"),
  fixedExpenseId: text("fixed_expense_id").references(() => fixedExpenses.id),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Investments (투자) ==========
export const investments = sqliteTable("investments", {
  id: text("id").primaryKey(),
  assetType: text("asset_type").notNull(),
  name: text("name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  avgPrice: real("avg_price"),
  currentPrice: real("current_price"),
  currentPriceUpdatedAt: text("current_price_updated_at"),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Investment Trades (매매기록) ==========
export const investmentTrades = sqliteTable("investment_trades", {
  id: text("id").primaryKey(),
  investmentId: text("investment_id").references(() => investments.id),
  tradeType: text("trade_type").notNull(),
  date: text("date").notNull(),
  quantity: real("quantity"),
  price: real("price"),
  amount: real("amount"),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Wardrobes (패션/옷장) ==========
export const wardrobes = sqliteTable("wardrobes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  brand: text("brand"),
  color: text("color"),
  style: text("style"),
  purchaseDate: text("purchase_date"),
  price: integer("price"),
  expenseId: text("expense_id").references(() => expenses.id),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Learning Logs (자기계발) ==========
export const learningLogs = sqliteTable("learning_logs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  author: text("author"),
  totalPages: integer("total_pages"),
  currentPages: integer("current_pages"),
  progress: integer("progress").default(0),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  rating: integer("rating"),
  review: text("review"),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Culture Logs (문화생활) ==========
export const cultureLogs = sqliteTable("culture_logs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  withWhom: text("with_whom"), // JSON array of relation ids
  rating: integer("rating"),
  review: text("review"),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ========== Hobby Projects (취미 프로젝트) ==========
export const hobbyProjects = sqliteTable("hobby_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  status: text("status").default("active"),
  memo: text("memo"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ========== Hobby Logs (취미 활동 기록) ==========
export const hobbyLogs = sqliteTable("hobby_logs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => hobbyProjects.id),
  date: text("date").notNull(),
  durationMin: integer("duration_min"),
  content: text("content"),
  memo: text("memo"),
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
