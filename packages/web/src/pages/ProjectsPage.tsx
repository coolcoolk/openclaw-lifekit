import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ProjectWithTasks, type Task, type Domain, type Area, type Kit } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getKitDashboard } from "@/components/kit-dashboards";
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
  Package,
  PackageCheck,
  ArrowLeft,
  Trash2,
  Save,
} from "lucide-react";

type StatusKey = "active" | "backlog" | "paused" | "completed";

function getStatusBadges(t: (key: string) => string): Record<StatusKey, { label: string; class: string }> {
  return {
    active: { label: t("projects.statusActive"), class: "bg-green-500/15 text-green-600" },
    backlog: { label: t("projects.statusBacklog"), class: "bg-blue-500/15 text-blue-600" },
    paused: { label: t("projects.statusPaused"), class: "bg-yellow-500/15 text-yellow-600" },
    completed: { label: t("projects.statusCompleted"), class: "bg-gray-500/15 text-gray-500" },
  };
}


function isRoutineProject(p: ProjectWithTasks) {
  return p.totalTasks > 0 && p.routineTasks / p.totalTasks >= 0.7;
}

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
  const { t } = useLanguage();
  const STATUS_BADGE = getStatusBadges(t);
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithTasks | null>(null);
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [showBrowseKits, setShowBrowseKits] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, d, k] = await Promise.all([
        api.getProjectsWithTasks(),
        api.getDomains(),
        api.getKits(),
      ]);
      setProjects(p);
      setDomains(d);
      setKits(k);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: { name: string; description: string; domainAreaId: string }) {
    await api.createProject({
      name: data.name,
      description: data.description || null,
      area_id: data.domainAreaId || null,
    } as any);
    setShowCreate(false);
    const updated = await api.getProjectsWithTasks();
    setProjects(updated);
  }

  async function handleProjectUpdate(id: string, data: Partial<ProjectWithTasks>) {
    await api.updateProject(id, data as any);
    const updated = await api.getProjectsWithTasks();
    setProjects(updated);
    if (selectedProject?.id === id) {
      const refreshed = updated.find((p) => p.id === id);
      if (refreshed) setSelectedProject(refreshed);
    }
  }

  async function handleInstallKit(kit: Kit) {
    setInstalling(kit.id);
    try {
      await api.installKit(kit.id);
      setKits((prev) =>
        prev.map((k) =>
          k.id === kit.id ? { ...k, installed: true, installedAt: new Date().toISOString() } : k
        )
      );
    } finally {
      setInstalling(null);
    }
  }

  async function handleDeleteProject(id: string) {
    if (!window.confirm(t("projects.deleteConfirm") || "정말 이 프로젝트를 삭제할까요?")) return;
    await api.deleteProject(id);
    const updated = await api.getProjectsWithTasks();
    setProjects(updated);
  }

  const installedKits = kits.filter((k) => k.installed);
  const availableKits = kits.filter((k) => !k.installed);

  // 도메인별 그룹핑
  const grouped = new Map<string, { domain: { id: string; name: string; icon: string; color: string }; projects: ProjectWithTasks[] }>();
  for (const p of projects) {
    const domainId = p.domainId || "default";
    if (!grouped.has(domainId)) {
      grouped.set(domainId, {
        domain: {
          id: domainId,
          name: p.domainName || t("projects.other"),
          icon: p.domainIcon || "📂",
          color: p.domainColor || DOMAIN_COLORS["default"],
        },
        projects: [],
      });
    }
    grouped.get(domainId)!.projects.push(p);
  }
  for (const group of grouped.values()) {
    group.projects.sort((a, b) => sortPriority(a) - sortPriority(b));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t("projects.loading")}
      </div>
    );
  }

  // Kit dashboard view
  if (selectedKit) {
    const Dashboard = getKitDashboard(selectedKit.id);
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* 고정 헤더 */}
        <div
          className="shrink-0 z-10 bg-background border-b border-border px-3 md:px-4 pt-3 pb-2"
        >
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedKit(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
              {t("projects.goBack")}
            </button>
            <div className="flex items-center gap-2 mt-1">
              <PackageCheck size={20} className="text-green-600" />
              <h1 className="text-xl md:text-2xl font-bold">{selectedKit.name}</h1>
            </div>
          </div>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-3 md:px-4 py-4">
            {Dashboard ? (
              <Dashboard />
            ) : (
              <div className="border border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">{t("projects.kitDashboardNotReady")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-3xl mx-auto py-6 px-3 md:py-8 md:px-4">
      {/* ── 활성화된 Kit 섹션 ── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("projects.activatedKits")}
        </h2>
        {installedKits.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">{t("projects.noActivatedKits")}</p>
            <button
              onClick={() => setShowBrowseKits(true)}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("projects.browseKits")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {installedKits.map((kit) => (
              <div
                key={kit.id}
                onClick={() => setSelectedKit(kit)}
                className="border border-border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 p-1.5 rounded-md bg-green-100">
                    <PackageCheck size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{kit.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{kit.description}</div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Kit 브라우징 섹션 (접기/펼치기) ── */}
      {availableKits.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowBrowseKits(!showBrowseKits)}
            className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {showBrowseKits ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {t("projects.browseKitsCount", { count: availableKits.length })}
          </button>
          {showBrowseKits && (
            <div className="space-y-2">
              {availableKits.map((kit) => (
                <div
                  key={kit.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 p-1.5 rounded-md bg-muted">
                      <Package size={16} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{kit.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{kit.description}</div>
                    </div>
                    <button
                      onClick={() => handleInstallKit(kit)}
                      disabled={installing === kit.id}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                      {installing === kit.id ? "..." : t("projects.activate")}
                    </button>
                  </div>
                  {kit.guide && (
                    <p className="text-[11px] text-muted-foreground/70 mt-2 ml-9 leading-relaxed whitespace-pre-line">
                      {kit.guide}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 프로젝트 섹션 ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold">{t("projects.projectTitle")}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          {t("projects.project")}
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
                  {t("projects.activeCount", { count: activeCount })}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {visibleProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  domainColor={domain.color}
                  onClick={() => {
                    if (isMobile) {
                      setSelectedProject(p);
                    } else {
                      navigate(`/projects/${p.id}`);
                    }
                  }}
                  onDelete={handleDeleteProject}
                />
              ))}

              {completedProjects.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {t("projects.completedCount", { count: completedProjects.length })}
                  </button>
                  {showCompleted && (
                    <div className="space-y-2 mt-1">
                      {completedProjects.map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          domainColor={domain.color}
                          onClick={() => {
                            if (isMobile) {
                              setSelectedProject(p);
                            } else {
                              navigate(`/projects/${p.id}`);
                            }
                          }}
                          onDelete={handleDeleteProject}
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

      {projects.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">🎯</p>
          <p className="text-sm">{t("projects.noProjects")}</p>
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

      {/* Mobile Project Detail Panel (모바일 전용) */}
      {selectedProject && isMobile && (
        <ProjectDetailPanel
          project={selectedProject}
          isMobile={true}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleProjectUpdate}
          onTasksChanged={loadData}
        />
      )}
    </div>
    </div>
  );
}

// ── 프로젝트 카드 ──
function ProjectCard({
  project: p,
  domainColor,
  onClick,
  onDelete,
}: {
  project: ProjectWithTasks;
  domainColor: string;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const STATUS_BADGE = getStatusBadges(t);
  const routine = isRoutineProject(p);
  const progress = p.totalTasks > 0 ? (p.doneTasks / p.totalTasks) * 100 : 0;
  const remaining = p.totalTasks - p.doneTasks;
  const status = (p.status as StatusKey) || "active";
  const badge = STATUS_BADGE[status] || STATUS_BADGE.active;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative border border-border rounded-lg px-4 py-3 transition-colors hover:bg-muted/30 cursor-pointer",
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
                {t("projects.routine")}
              </span>
            )}
            <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium", badge.class)}>
              {badge.label}
            </span>
          </div>

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

          {routine && p.todayTask && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw size={10} />
              <span className="truncate">{p.todayTask}</span>
            </div>
          )}

          {!routine && remaining > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("projects.tasksRemaining", { count: remaining })}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(p.id);
          }}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          title={t("common.delete") || "Delete"}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── MobileBottomSheet ──
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

// ── 프로젝트 상세 콘텐츠 ──
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
  const { t } = useLanguage();
  const STATUS_BADGE = getStatusBadges(t);
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

  async function handleUpdateTask(id: string, data: Record<string, any>) {
    try {
      await api.updateTask(id, data as any);
      await loadTasks();
      onTasksChanged();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await api.deleteTask(id);
      await loadTasks();
      onTasksChanged();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    await api.createTask({
      title: newTaskTitle.trim(),
      project_id: project.id,
      status: "todo",
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
            placeholder={t("projects.projectName")}
          />
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5" data-bottom-sheet-body>
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

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0">{t("projects.status")}</span>
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

        <div className="flex items-start gap-2">
          <AlignLeft size={14} className="mt-2 shrink-0 text-muted-foreground" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => autoSave("description", description)}
            placeholder={t("projects.addDescription")}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

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
            placeholder={t("projects.targetDate")}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("projects.progress")}</span>
            <span>{t("projects.progressComplete", { done: project.doneTasks, total: project.totalTasks })}</span>
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

        <div className="border-t border-border" />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t("projects.tasksSection")}</h3>
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={14} />
              {t("projects.addTask")}
            </button>
          </div>

          {loadingTasks ? (
            <p className="text-xs text-muted-foreground py-4 text-center">{t("projects.loading")}</p>
          ) : (
            <div>
              {showNewTask && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 mb-2">
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
                    placeholder={t("projects.newTaskTitle")}
                    className="flex-1 text-sm bg-transparent border-none outline-none"
                  />
                </div>
              )}

              {(pendingTasks.length > 0 || doneTasks.length > 0) && <TaskTableHeader />}

              {pendingTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => handleToggleTask(task)}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                />
              ))}

              {doneTasks.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground mt-3 mb-1 uppercase tracking-wide">
                    {t("projects.completedTasksCount", { count: doneTasks.length })}
                  </p>
                  {doneTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => handleToggleTask(task)}
                      onUpdate={handleUpdateTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </>
              )}

              {tasks.length === 0 && !showNewTask && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("projects.noTasksYet")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── 태스크 테이블 헤더 ──
function TaskTableHeader() {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-[1fr_32px_64px_32px] gap-0 border-b border-border px-2 py-1.5">
      <span className="text-[11px] text-muted-foreground font-medium">{t("projects.taskName")}</span>
      <span className="text-[11px] text-muted-foreground font-medium text-center">{t("projects.done")}</span>
      <span className="text-[11px] text-muted-foreground font-medium text-center">{t("projects.dueDate")}</span>
      <span />
    </div>
  );
}

// ── 태스크 행 (노션 스타일 표 형식) ──
function TaskRow({
  task,
  onToggle,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onUpdate?: (id: string, data: Record<string, any>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const isDone = task.status === "done";
  const [editingField, setEditingField] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "");

  useEffect(() => {
    setEditTitle(task.title);
    setEditDueDate(task.dueDate || "");
  }, [task]);

  async function saveField(field: string, value: any) {
    if (!onUpdate) return;
    const data: Record<string, any> = {};
    switch (field) {
      case "title":
        if (!value.trim()) { setEditTitle(task.title); return; }
        data.title = value.trim();
        break;
      case "dueDate":
        data.due_date = value || null;
        break;
    }
    setEditingField(null);
    await onUpdate(task.id, data);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm(t("projects.deleteTaskConfirm"))) return;
    await onDelete(task.id);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_32px_64px_32px] gap-0 border-b border-border px-2 py-1.5 items-center hover:bg-muted/30 transition-colors group",
        isDone && "opacity-50"
      )}
    >
      {/* 이름 셀 */}
      <div
        className="min-w-0 pr-1 cursor-pointer"
        onClick={() => onUpdate && setEditingField("title")}
      >
        {editingField === "title" ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => saveField("title", editTitle)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveField("title", editTitle);
              if (e.key === "Escape") { setEditTitle(task.title); setEditingField(null); }
            }}
            className="w-full text-sm bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        ) : (
          <span className={cn("text-sm truncate block", isDone && "line-through text-muted-foreground")}>
            {task.title}
          </span>
        )}
      </div>

      {/* 완료 체크박스 */}
      <div className="flex justify-center">
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
      </div>

      {/* 마감일 */}
      <div
        className="flex justify-center cursor-pointer"
        onClick={() => onUpdate && setEditingField("dueDate")}
      >
        {editingField === "dueDate" ? (
          <input
            type="date"
            autoFocus
            value={editDueDate}
            onChange={(e) => {
              setEditDueDate(e.target.value);
              saveField("dueDate", e.target.value);
            }}
            onBlur={() => setEditingField(null)}
            className="text-[10px] w-full bg-background border border-border rounded px-0.5 py-0.5 focus:outline-none"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {task.dueDate ? task.dueDate.slice(5) : "—"}
          </span>
        )}
      </div>

      {/* 삭제 */}
      <div className="flex justify-center">
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="p-0.5 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
            title={t("common.delete")}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── 프로젝트 상세 패널 (모바일 전용) ──
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

  // 모바일에서만 bottom sheet으로 표시
  return (
    <MobileBottomSheet open={true} onClose={onClose}>
      {detailContent}
    </MobileBottomSheet>
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
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    api.getAreas().then(setAllAreas).catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim(),
      domainAreaId: selectedArea || "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("projects.newProject")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={nameRef}
            type="text"
            placeholder={t("projects.projectName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t("projects.selectArea")}</option>
            {domains.map((d) => {
              const domainAreas = allAreas.filter((a) => a.domainId === d.id);
              if (domainAreas.length === 0) return null;
              return (
                <optgroup key={d.id} label={`${d.icon || ""} ${d.name}`}>
                  {domainAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <textarea
            placeholder={t("projects.descriptionOptional")}
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {t("calendar.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
