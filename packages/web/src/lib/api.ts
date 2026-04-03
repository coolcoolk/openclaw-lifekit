const BASE_URL = "/api";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// Types
export interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface Area {
  id: string;
  domainId: string;
  name: string;
  icon: string;
  description: string | null;
  satisfaction: number | null;
  sortOrder: number;
}

export interface Project {
  id: string;
  areaId: string | null;
  name: string;
  description: string | null;
  status: string;
  targetDate: string | null;
}

export interface ProjectWithTasks extends Project {
  domainId: string | null;
  domainName: string | null;
  domainIcon: string | null;
  domainColor: string | null;
  totalTasks: number;
  doneTasks: number;
  routineTasks: number;
  todayTask: string | null;
}

// Task = Event (태스크 = 이벤트, startAt 있으면 캘린더, 없으면 backlog)
export interface Task {
  id: string;
  projectId: string | null;
  areaId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  isRoutine: boolean;
  tags: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  // Calendar fields
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  location: string | null;
  source: string;
  externalId: string | null;
  color: string | null;
  linkedDomainId: string | null;
  relationIds: string | null; // JSON array of relation ids
  // JOIN fields
  projectName?: string | null;
  domainId?: string | null;
}

// CalendarEvent는 이제 Task의 alias (하위 호환)
export type CalendarEvent = Task;

export interface BalanceData {
  domainId: string;
  domainName: string;
  count: number;
}

export interface SatisfactionRecord {
  id: string;
  areaId: string;
  score: number;
  recordedAt: string;
  note: string | null;
}

export interface Relation {
  id: string;
  name: string;
  nickname: string | null;
  relationType: string | null;
  birthday: string | null;
  memo: string | null;
  lastMetAt: string | null;
  meetingCount: number;
  createdAt: string;
  updatedAt: string;
  intimacyScore?: number;
}

export interface AreaXp {
  id: string;
  areaId: string;
  xp: number;
  level: number;
}

export interface Kit {
  id: string;
  name: string;
  nameEn: string;
  version: string;
  areaId: string;
  description: string;
  tables: string[];
  routes: string;
  installed: boolean;
  installedAt: string | null;
  config: Record<string, any> | null;
  guide?: string;
}

export interface RelationStats {
  relationType: string | null;
  count: number;
}

export interface Report {
  id: string;
  type: string; // daily | weekly
  date: string;
  dateEnd: string | null;
  status: string; // draft | sent
  diary: string | null;
  nextPlan: string | null;
  meta: string | null; // JSON string
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiStatus {
  configured: boolean;
  connected: boolean;
  adapter: string | null;
  gatewayUrl: string | null;
}

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
  kitPreferences: Record<string, Record<string, string>>;
  dashboard: {
    defaultPage: string;
    theme: "light" | "dark" | "system";
    language: "ko" | "en";
  };
}

// API calls
export const api = {
  // Domains
  getDomains: () => fetchJSON<Domain[]>("/domains"),

  // Areas
  getAreas: (domainId?: string) =>
    fetchJSON<Area[]>(domainId ? `/areas?domain_id=${domainId}` : "/areas"),
  getSatisfactionHistory: (areaId: string) =>
    fetchJSON<SatisfactionRecord[]>(`/areas/${areaId}/satisfaction-history`),
  getAllSatisfactionHistory: () =>
    fetchJSON<SatisfactionRecord[]>("/areas/satisfaction-history/all"),

  // Projects
  getProjects: (params?: { area_id?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchJSON<Project[]>(`/projects${query ? `?${query}` : ""}`);
  },
  getProjectsWithTasks: () => fetchJSON<ProjectWithTasks[]>("/projects/with-tasks"),
  createProject: (data: Partial<Project>) =>
    fetchJSON<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    fetchJSON<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    fetchJSON<void>(`/projects/${id}`, { method: "DELETE" }),

  // Tasks (통합: backlog + calendar)
  getTasks: (params?: { project_id?: string; area_id?: string; status?: string; before?: string; view?: string; start?: string; end?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchJSON<Task[]>(`/tasks${query ? `?${query}` : ""}`);
  },
  getCalendarTasks: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    params.set("view", "calendar");
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return fetchJSON<Task[]>(`/tasks?${params.toString()}`);
  },
  getBacklogTasks: () =>
    fetchJSON<Task[]>("/tasks?view=backlog"),
  createTask: (data: Partial<Task> & Record<string, any>) =>
    fetchJSON<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task> & Record<string, any>) =>
    fetchJSON<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),

  // Calendar (하위 호환 + sync)
  getEvents: (start?: string, end?: string) => {
    // 이제 tasks API의 calendar view를 사용
    const params = new URLSearchParams();
    params.set("view", "calendar");
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return fetchJSON<Task[]>(`/tasks?${params.toString()}`);
  },
  getEvent: (id: string) =>
    fetchJSON<Task>(`/tasks/${id}`),
  createEvent: (data: Record<string, any>) =>
    fetchJSON<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id: string, data: Record<string, any>) =>
    fetchJSON<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEvent: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),
  syncCalendar: () =>
    fetchJSON<{ added: number; updated: number; pushed: number; errors: string[] }>("/calendar/sync"),

  // Balance
  getBalance: (days = 7) =>
    fetchJSON<BalanceData[]>(`/tasks/balance?days=${days}`),

  // Onboarding
  onboardingChat: (data: { areaId: string; message: string; history: { role: string; content: string }[]; sessionId?: string }) =>
    fetchJSON<{ message: string; isComplete: boolean; data: Record<string, any>; sessionId: string }>("/onboarding/chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Relations
  getRelations: () => fetchJSON<Relation[]>("/relations"),
  getRelation: (id: string) => fetchJSON<Relation>(`/relations/${id}`),
  getTasksByRelation: (relationId: string) => fetchJSON<Task[]>(`/tasks?relation_id=${relationId}`),
  getRelationStats: () => fetchJSON<RelationStats[]>("/relations/stats"),
  createRelation: (data: Partial<Relation> & Record<string, any>) =>
    fetchJSON<Relation>("/relations", { method: "POST", body: JSON.stringify(data) }),
  updateRelation: (id: string, data: Partial<Relation> & Record<string, any>) =>
    fetchJSON<Relation>(`/relations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRelation: (id: string) =>
    fetchJSON<{ ok: boolean }>(`/relations/${id}`, { method: "DELETE" }),

  // Area XP
  getAreaXp: (areaId: string) => fetchJSON<AreaXp>(`/areas/xp/${areaId}`),
  addAreaXp: (areaId: string, data: { amount: number; reason: string }) =>
    fetchJSON<AreaXp>(`/areas/xp/${areaId}`, { method: "POST", body: JSON.stringify(data) }),
  getAllAreaXp: () => fetchJSON<AreaXp[]>("/areas/xp/all"),

  // Reports
  getReports: (type?: string) =>
    fetchJSON<Report[]>(type ? `/reports?type=${type}` : "/reports"),
  getReport: (id: string) => fetchJSON<Report>(`/reports/${id}`),
  createReport: (data: Partial<Report> & Record<string, any>) =>
    fetchJSON<Report>("/reports", { method: "POST", body: JSON.stringify(data) }),
  updateReport: (id: string, data: Record<string, any>) =>
    fetchJSON<Report>(`/reports/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  generateReport: (type: string, date: string) =>
    fetchJSON<Report>("/reports/generate", { method: "POST", body: JSON.stringify({ type, date }) }),

  // Projects (area-scoped)
  getAreaProjects: (areaId: string) =>
    fetchJSON<Project[]>(`/projects?area_id=${areaId}`),
  getProjectTasks: (projectId: string) =>
    fetchJSON<Task[]>(`/tasks?project_id=${projectId}`),

  // Kits
  getKits: () => fetchJSON<Kit[]>("/kits"),
  getKit: (kitId: string) => fetchJSON<Kit>(`/kits/${kitId}`),
  installKit: (kitId: string, config?: Record<string, any>) =>
    fetchJSON<{ ok: boolean; kitId: string; installedAt: string }>(`/kits/${kitId}/install`, {
      method: "POST",
      body: JSON.stringify(config ? { config } : {}),
    }),
  uninstallKit: (kitId: string) =>
    fetchJSON<{ ok: boolean }>(`/kits/${kitId}/uninstall`, { method: "DELETE" }),

  // Kit Data APIs
  // Diet
  getDietLogs: (date?: string) =>
    fetchJSON<any[]>(date ? `/kits/diet/logs?date=${date}` : "/kits/diet/logs"),
  getDietSummary: (date: string) =>
    fetchJSON<any>(`/kits/diet/summary?date=${date}`),

  // Exercise
  getExerciseLogs: (date?: string) =>
    fetchJSON<any[]>(date ? `/kits/exercise/logs?date=${date}` : "/kits/exercise/logs"),
  getExerciseWeeklyStats: () =>
    fetchJSON<any[]>("/kits/exercise/stats/weekly"),

  // Finance
  getFinanceExpenses: (params?: { date?: string; type?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchJSON<any[]>(`/kits/finance/expenses${query ? `?${query}` : ""}`);
  },
  getFinanceSummary: (month: string) =>
    fetchJSON<any>(`/kits/finance/summary?month=${month}`),
  getFixedExpenses: () =>
    fetchJSON<any[]>("/kits/finance/fixed"),

  // Investment
  getInvestmentAssets: () =>
    fetchJSON<any[]>("/kits/investment/assets"),
  getInvestmentSummary: () =>
    fetchJSON<any[]>("/kits/investment/summary"),

  // Learning
  getLearningLogs: () =>
    fetchJSON<any[]>("/kits/learning/logs"),

  // Culture
  getCultureLogs: () =>
    fetchJSON<any[]>("/kits/culture/logs"),

  // Fashion
  getFashionItems: () =>
    fetchJSON<any[]>("/kits/fashion/items"),

  // Hobby
  getHobbyProjects: (status?: string) =>
    fetchJSON<any[]>(status ? `/kits/hobby/projects?status=${status}` : "/kits/hobby/projects"),
  getHobbyLogs: () =>
    fetchJSON<any[]>("/kits/hobby/logs"),

  // Kit Create APIs
  createExerciseLog: (data: { date: string; activity_type: string; duration_min?: number; calories?: number }) =>
    fetchJSON<any>("/kits/exercise/logs", { method: "POST", body: JSON.stringify(data) }),
  createDietLog: (data: { date: string; meal_type: string; food_name: string; calories?: number }) =>
    fetchJSON<any>("/kits/diet/logs", { method: "POST", body: JSON.stringify(data) }),
  createFinanceExpense: (data: { date: string; memo: string; amount: number; type: string; expense_type?: string }) =>
    fetchJSON<any>("/kits/finance/expenses", { method: "POST", body: JSON.stringify(data) }),
  createInvestmentAsset: (data: { name: string; asset_type: string; quantity?: number; avg_price?: number }) =>
    fetchJSON<any>("/kits/investment/assets", { method: "POST", body: JSON.stringify(data) }),
  createLearningLog: (data: { title: string; type: string; started_at?: string }) =>
    fetchJSON<any>("/kits/learning/logs", { method: "POST", body: JSON.stringify(data) }),
  createCultureLog: (data: { title: string; type: string; date: string; rating?: number }) =>
    fetchJSON<any>("/kits/culture/logs", { method: "POST", body: JSON.stringify(data) }),
  createFashionItem: (data: { name: string; category?: string; brand?: string }) =>
    fetchJSON<any>("/kits/fashion/items", { method: "POST", body: JSON.stringify(data) }),
  createHobbyProject: (data: { name: string; memo?: string }) =>
    fetchJSON<any>("/kits/hobby/projects", { method: "POST", body: JSON.stringify(data) }),

  // Settings
  getSettings: () => fetchJSON<Settings>("/settings"),
  updateSettings: (data: Partial<Settings>) =>
    fetchJSON<Settings>("/settings", { method: "PATCH", body: JSON.stringify(data) }),
  getAiStatus: () => fetchJSON<AiStatus>("/settings/ai-status"),
};
