import { useEffect, useState, useRef, useCallback } from "react";
import { api, type ProjectWithTasks, type Task, type Domain } from "@/lib/api";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  Check,
  Calendar,
  AlignLeft,
  Clock,
} from "lucide-react";

type StatusKey = "active" | "backlog" | "paused" | "completed";

const STATUS_BADGE: Record<StatusKey, { label: string; class: string }> = {
  active: { label: "진행 중", class: "bg-green-500/15 text-green-600" },
  backlog: { label: "대기", class: "bg-blue-500/15 text-blue-600" },
  paused: { label: "일시중단", class: "bg-yellow-500/15 text-yellow-600" },
  completed: { label: "완료", class: "bg-gray-500/15 text-gray-500" },
};

const PRIORITY_BADGE: Record<string, { label: string; class: string }> = {
  P1: { label: "P1", class: "bg-red-500/15 text-red-600" },
  P2: { label: "P2", class: "bg-orange-500/15 text-orange-600" },
  P3: { label: "P3", class: "bg-gray-500/15 text-gray-500" },
};

function isRoutineProject(p: ProjectWithTasks) {
  return p.totalTasks > 0 && p.routineTasks / p.totalTasks >= 0.7;
}

// 정렬 우선순위
function sortPriority(p: ProjectWithTasks): number {
  const routine = isRoutineProject(p);
  if (p.status === "active" && !routine) return 0;
  if (p.status === "backlog" && !routine) return 1;
  if (p.status === "active" && routine) return 2;
  if (p.status === "paused") return 3;
  if (p.status === "completed") return 4;
  return 5;
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, d] = await Promise.all([
        api.getProjectsWithTasks(),
        api.getDomains(),
      ]);
      setProjects(p);
      setDomains(d);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: { name: string; description: string; domainAreaId: string }) {
    const created = await api.createProject({
      name: data.name,
      description: data.description || null,
      areaId: data.domainAreaId || null,
    } as any);
    setShowCreate(false);
    // reload to get full data with tasks
    const updated = await api.getProjectsWithTasks();
    setProjects(updated);
  }

  async function handleProjectUpdate(id: string, data: Partial<ProjectWithTasks>) {
    await api.updateProject(id, data as any);
    const updated = await api.getProjectsWithTasks();
    setProjects(updated);
    // Refresh selectedProject if still open
    if (selectedProject?.id === id) {
      const refreshed = updated.find((p) => p.id === id);
      if (refreshed) setSelectedProject(refreshed);
    }
  }

  // 도메인별 그룹핑
  const grouped = new Map<string, { domain: { id: string; name: string; icon: string; color: string }; projects: ProjectWithTasks[] }>();

  for (const p of projects) {
    const domainId = p.domainId || "default";
    if (!grouped.has(domainId)) {
      grouped.set(domainId, {
        domain: {
          id: domainId,
          name: p.domainName || "기타",
          icon: p.domainIcon || "📂",
          color: p.domainColor || DOMAIN_COLORS["default"],
        },
        projects: [],
      });
    }
    grouped.get(domainId)!.projects.push(p);
  }

  // 각 그룹 내 정렬
  for (const group of grouped.values()) {
    group.projects.sort((a, b) => sortPriority(a) - sortPriority(b));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 md:py-8 md:px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">🎯 프로젝트</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          프로젝트
        </button>
      </div>

      {/* Domain Groups */}
      {Array.from(grouped.values()).map(({ domain, projects: domainProjects }) => {
        const activeCount = domainProjects.filter(
          (p) => p.status === "active" && !isRoutineProject(p)
        ).length;
        const completedProjects = domainProjects.filter((p) => p.status === "completed");
        const visibleProjects = domainProjects.filter((p) => p.status !== "completed");

        return (
          <div key={domain.id} className="mb-8">
            {/* Domain Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{domain.icon}</span>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {domain.name}
              </h2>
              {activeCount > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${domain.color}20`,
                    color: domain.color,
                  }}
                >
                  {activeCount}개 진행 중
                </span>
              )}
            </div>

            {/* Project Cards */}
            <div className="space-y-2">
              {visibleProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  domainColor={domain.color}
                  onClick={() => setSelectedProject(p)}
                />
              ))}

              {/* Completed toggle */}
              {completedProjects.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    완료됨 ({completedProjects.length})
                  </button>
                  {showCompleted && (
                    <div className="space-y-2 mt-1">
                      {completedProjects.map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          domainColor={domain.color}
                          onClick={() => setSelectedProject(p)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">🎯</p>
          <p className="text-sm">프로젝트가 없어요. 위에서 추가해보세요!</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateProjectModal
          domains={domains}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Project Detail Panel */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          isMobile={isMobile}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleProjectUpdate}
          onTasksChanged={loadData}
        />
      )}
    </div>
  );
}

// ── 프로젝트 카드 ──
function ProjectCard({
  project: p,
  domainColor,
  onClick,
}: {
  project: ProjectWithTasks;
  domainColor: string;
  onClick: () => void;
}) {
  const routine = isRoutineProject(p);
  const progress = p.totalTasks > 0 ? (p.doneTasks / p.totalTasks) * 100 : 0;
  const remaining = p.totalTasks - p.doneTasks;
  const status = (p.status as StatusKey) || "active";
  const badge = STATUS_BADGE[status] || STATUS_BADGE.active;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative border border-border rounded-lg px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer",
        routine && "opacity-60"
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: domainColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{p.name}</span>
            {routine && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-500 font-medium">
                루틴
              </span>
            )}
            <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium", badge.class)}>
              {badge.label}
            </span>
          </div>

          {/* Progress bar */}
          {p.totalTasks > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: domainColor,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {p.doneTasks}/{p.totalTasks}
                </span>
              </div>
            </div>
          )}

          {/* Routine: 오늘 할 태스크 */}
          {routine && p.todayTask && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw size={10} />
              <span className="truncate">{p.todayTask}</span>
            </div>
          )}

          {/* 남은 태스크 */}
          {!routine && remaining > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {remaining}개 태스크 남음
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MobileBottomSheet (CalendarPage와 동일 패턴) ──
function MobileBottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const scrollable = sheet.querySelector("[data-bottom-sheet-body]");
    if (scrollable && scrollable.scrollTop > 0) return;

    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.currentY = e.touches[0].clientY;
    dragRef.current.dragging = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.dragging || !sheetRef.current) return;
    const currentY = e.touches[0].clientY;
    dragRef.current.currentY = currentY;
    const deltaY = currentY - dragRef.current.startY;
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.dragging || !sheetRef.current) return;
    const deltaY = dragRef.current.currentY - dragRef.current.startY;
    dragRef.current.dragging = false;

    if (deltaY > 100) {
      sheetRef.current.style.transform = "translateY(100%)";
      setTimeout(onClose, 200);
    } else {
      sheetRef.current.style.transform = "translateY(0)";
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-background rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-200 ease-out"
        style={{
          maxHeight: "85vh",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: "translateY(0)",
          animation: "bottomSheetSlideUp 0.2s ease-out",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {children}
      </div>
    </>
  );
}

// ── 프로젝트 상세 콘텐츠 (PC/모바일 공용) ──
function ProjectDetailContent({
  project,
  onClose,
  onUpdate,
  onTasksChanged,
}: {
  project: ProjectWithTasks;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<ProjectWithTasks>) => void;
  onTasksChanged: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState<StatusKey>((project.status as StatusKey) || "active");
  const [targetDate, setTargetDate] = useState(project.targetDate || "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const newTaskRef = useRef<HTMLInputElement>(null);

  const domainColor = project.domainColor || DOMAIN_COLORS["default"];
  const progress = project.totalTasks > 0 ? (project.doneTasks / project.totalTasks) * 100 : 0;

  // Load tasks for this project
  useEffect(() => {
    loadTasks();
  }, [project.id]);

  async function loadTasks() {
    setLoadingTasks(true);
    try {
      const t = await api.getTasks({ project_id: project.id });
      setTasks(t);
    } finally {
      setLoadingTasks(false);
    }
  }

  // Reset state when project changes
  useEffect(() => {
    setName(project.name);
    setDescription(project.description || "");
    setStatus((project.status as StatusKey) || "active");
    setTargetDate(project.targetDate || "");
  }, [project.id]);

  const autoSave = useCallback(
    (field: string, value: string) => {
      const payload: Record<string, any> = {};
      switch (field) {
        case "name":
          if (!value.trim()) return;
          payload.name = value.trim();
          break;
        case "description":
          payload.description = value.trim() || null;
          break;
        case "status":
          payload.status = value;
          break;
        case "targetDate":
          payload.targetDate = value || null;
          break;
      }
      onUpdate(project.id, payload);
    },
    [project.id, onUpdate],
  );

  async function handleToggleTask(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    await api.updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    } as any);
    await loadTasks();
    onTasksChanged();
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    await api.createTask({
      title: newTaskTitle.trim(),
      project_id: project.id,
      status: "todo",
      priority: "P3",
    } as any);
    setNewTaskTitle("");
    setShowNewTask(false);
    await loadTasks();
    onTasksChanged();
  }

  useEffect(() => {
    if (showNewTask) {
      newTaskRef.current?.focus();
    }
  }, [showNewTask]);

  const inputClass = "w-full px-2 py-1.5 text-sm border border-transparent rounded-md bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border focus:outline-none transition-colors";

  const doneTasks = tasks.filter((t) => t.status === "done");
  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: domainColor }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => autoSave("name", name)}
            className="font-semibold text-sm bg-transparent border-none outline-none flex-1 min-w-0 hover:bg-muted/50 focus:bg-muted/50 rounded px-1 py-0.5"
            placeholder="프로젝트 이름"
          />
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5" data-bottom-sheet-body>
        {/* 도메인/영역 태그 */}
        {project.domainName && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{project.domainIcon || "📂"}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${domainColor}20`,
                color: domainColor,
              }}
            >
              {project.domainName}
            </span>
          </div>
        )}

        {/* 상태 뱃지 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0">상태</span>
          <div className="flex gap-1.5">
            {(Object.keys(STATUS_BADGE) as StatusKey[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setStatus(key);
                  autoSave("status", key);
                }}
                className={cn(
                  "text-[11px] px-2 py-1 rounded font-medium transition-all",
                  status === key
                    ? STATUS_BADGE[key].class
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {STATUS_BADGE[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* 설명 */}
        <div className="flex items-start gap-2">
          <AlignLeft size={14} className="mt-2 shrink-0 text-muted-foreground" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => autoSave("description", description)}
            placeholder="설명 추가"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* 목표 완료일 */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="shrink-0 text-muted-foreground" />
          <input
            type="date"
            value={targetDate}
            onChange={(e) => {
              setTargetDate(e.target.value);
              autoSave("targetDate", e.target.value);
            }}
            className={inputClass}
            placeholder="목표 완료일"
          />
        </div>

        {/* 진행률 바 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>진행률</span>
            <span>{project.doneTasks}/{project.totalTasks} 완료</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: domainColor,
              }}
            />
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-border" />

        {/* 태스크 목록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">태스크</h3>
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={14} />
              태스크 추가
            </button>
          </div>

          {loadingTasks ? (
            <p className="text-xs text-muted-foreground py-4 text-center">로딩 중...</p>
          ) : (
            <div className="space-y-1">
              {/* 인라인 새 태스크 입력 */}
              {showNewTask && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30">
                  <div className="w-4 h-4 rounded border border-border shrink-0" />
                  <input
                    ref={newTaskRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask();
                      if (e.key === "Escape") { setShowNewTask(false); setNewTaskTitle(""); }
                    }}
                    onBlur={() => {
                      if (!newTaskTitle.trim()) { setShowNewTask(false); setNewTaskTitle(""); }
                    }}
                    placeholder="새 태스크 제목"
                    className="flex-1 text-sm bg-transparent border-none outline-none"
                  />
                </div>
              )}

              {/* 진행 중 태스크 */}
              {pendingTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={() => handleToggleTask(task)} />
              ))}

              {/* 완료된 태스크 */}
              {doneTasks.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground mt-3 mb-1 uppercase tracking-wide">
                    완료 ({doneTasks.length})
                  </p>
                  {doneTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={() => handleToggleTask(task)} />
                  ))}
                </>
              )}

              {/* 빈 상태 */}
              {tasks.length === 0 && !showNewTask && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  아직 태스크가 없어요
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── 태스크 행 ──
function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const isDone = task.status === "done";
  const priorityBadge = PRIORITY_BADGE[task.priority];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors group",
        isDone && "opacity-50"
      )}
    >
      {/* 체크박스 */}
      <button
        onClick={onToggle}
        className={cn(
          "w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
          isDone
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border hover:border-primary/50"
        )}
      >
        {isDone && <Check size={10} />}
      </button>

      {/* 제목 */}
      <span
        className={cn(
          "flex-1 text-sm truncate",
          isDone && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      {/* 우선순위 뱃지 */}
      {priorityBadge && task.priority !== "P3" && (
        <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium", priorityBadge.class)}>
          {priorityBadge.label}
        </span>
      )}

      {/* 예상시간 */}
      {task.estimatedMinutes && (
        <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock size={10} />
          {task.estimatedMinutes}m
        </span>
      )}
    </div>
  );
}

// ── 프로젝트 상세 패널 (PC: 우측 슬라이드인 / 모바일: Bottom Sheet) ──
function ProjectDetailPanel({
  project,
  isMobile,
  onClose,
  onUpdate,
  onTasksChanged,
}: {
  project: ProjectWithTasks;
  isMobile: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<ProjectWithTasks>) => void;
  onTasksChanged: () => void;
}) {
  const detailContent = (
    <ProjectDetailContent
      project={project}
      onClose={onClose}
      onUpdate={onUpdate}
      onTasksChanged={onTasksChanged}
    />
  );

  if (isMobile) {
    return (
      <MobileBottomSheet open={true} onClose={onClose}>
        {detailContent}
      </MobileBottomSheet>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50 flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
        {detailContent}
      </div>
    </>
  );
}

// ── 프로젝트 생성 모달 ──
function CreateProjectModal({
  domains,
  onClose,
  onCreate,
}: {
  domains: Domain[];
  onClose: () => void;
  onCreate: (data: { name: string; description: string; domainAreaId: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      domainAreaId: selectedDomain,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">새 프로젝트</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={nameRef}
            type="text"
            placeholder="프로젝트 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">도메인 선택 (선택사항)</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name}
              </option>
            ))}
          </select>

          <textarea
            placeholder="설명 (선택사항)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
