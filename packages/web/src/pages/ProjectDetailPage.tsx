import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type ProjectWithTasks, type Task } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Check,
  Calendar,
  AlignLeft,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X,
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

const PRIORITY_BADGE: Record<string, { label: string; class: string }> = {
  P1: { label: "P1", class: "bg-red-500/15 text-red-600" },
  P2: { label: "P2", class: "bg-orange-500/15 text-orange-600" },
  P3: { label: "P3", class: "bg-gray-500/15 text-gray-500" },
};

function getTaskStatusBadges(t: (key: string) => string): Record<string, { label: string; class: string }> {
  return {
    todo: { label: t("projectDetail.taskStatusTodo"), class: "bg-blue-500/15 text-blue-600" },
    in_progress: { label: t("projectDetail.taskStatusInProgress"), class: "bg-yellow-500/15 text-yellow-600" },
    done: { label: t("projectDetail.taskStatusDone"), class: "bg-green-500/15 text-green-600" },
  };
}

export function ProjectDetailPage() {
  const { t } = useLanguage();
  const STATUS_BADGE = getStatusBadges(t);
  const TASK_STATUS_BADGE = getTaskStatusBadges(t);
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectWithTasks | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<StatusKey>("active");
  const [targetDate, setTargetDate] = useState("");

  // New task form
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("P3");
  const [newTaskEstimate, setNewTaskEstimate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const newTaskRef = useRef<HTMLInputElement>(null);

  // Expanded task for detail view
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    loadProject();
    loadTasks();
  }, [projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const projects = await api.getProjectsWithTasks();
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        setName(found.name);
        setDescription(found.description || "");
        setStatus((found.status as StatusKey) || "active");
        setTargetDate(found.targetDate || "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    if (!projectId) return;
    setLoadingTasks(true);
    try {
      const t = await api.getTasks({ project_id: projectId });
      setTasks(t);
    } finally {
      setLoadingTasks(false);
    }
  }

  const autoSave = useCallback(
    async (field: string, value: string) => {
      if (!projectId) return;
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
      await api.updateProject(projectId, payload as any);
      // Refresh project data
      const projects = await api.getProjectsWithTasks();
      const found = projects.find((p) => p.id === projectId);
      if (found) setProject(found);
    },
    [projectId]
  );

  async function handleToggleTask(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    await api.updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    } as any);
    await Promise.all([loadTasks(), loadProject()]);
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim() || !projectId) return;
    await api.createTask({
      title: newTaskTitle.trim(),
      project_id: projectId,
      status: "todo",
      priority: newTaskPriority,
      estimated_minutes: newTaskEstimate ? parseInt(newTaskEstimate) : null,
      due_date: newTaskDueDate || null,
    } as any);
    setNewTaskTitle("");
    setNewTaskPriority("P3");
    setNewTaskEstimate("");
    setNewTaskDueDate("");
    setShowNewTask(false);
    await Promise.all([loadTasks(), loadProject()]);
  }

  useEffect(() => {
    if (showNewTask) newTaskRef.current?.focus();
  }, [showNewTask]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t("projects.loading")}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground mb-4">{t("projectDetail.notFound")}</p>
        <button
          onClick={() => navigate("/projects")}
          className="text-sm text-primary hover:underline"
        >
          {t("projectDetail.backToList")}
        </button>
      </div>
    );
  }

  const domainColor = project.domainColor || DOMAIN_COLORS["default"];
  const progress = project.totalTasks > 0 ? (project.doneTasks / project.totalTasks) * 100 : 0;
  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const inputClass =
    "w-full px-2 py-1.5 text-sm border border-transparent rounded-md bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border focus:outline-none transition-colors";

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 md:py-8 md:px-4">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        {t("projectDetail.projectList")}
      </button>

      {/* 프로젝트 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: domainColor }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => autoSave("name", name)}
            className="text-xl md:text-2xl font-bold bg-transparent border-none outline-none flex-1 min-w-0 hover:bg-muted/50 focus:bg-muted/50 rounded px-1 py-0.5"
            placeholder={t("projects.projectName")}
          />
        </div>

        {project.domainName && (
          <div className="flex items-center gap-2 ml-6 mb-4">
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
      </div>

      {/* 프로젝트 정보 카드 */}
      <div className="border border-border rounded-lg p-5 mb-6 space-y-4">
        {/* 상태 */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">상태</span>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(STATUS_BADGE) as StatusKey[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setStatus(key);
                  autoSave("status", key);
                }}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded font-medium transition-all",
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
        <div className="flex items-start gap-3">
          <AlignLeft size={14} className="mt-2 shrink-0 text-muted-foreground" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => autoSave("description", description)}
            placeholder="설명 추가..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* 목표일 */}
        <div className="flex items-center gap-3">
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

        {/* 진행률 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>진행률</span>
            <span>
              {project.doneTasks}/{project.totalTasks} 완료
            </span>
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
      </div>

      {/* 태스크 섹션 */}
      <div className="border border-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">📋 태스크</h3>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            태스크 추가
          </button>
        </div>

        <div className="p-3">
          {loadingTasks ? (
            <p className="text-xs text-muted-foreground py-8 text-center">로딩 중...</p>
          ) : (
            <div className="space-y-1">
              {/* 새 태스크 인라인 폼 */}
              {showNewTask && (
                <div className="border border-primary/30 rounded-lg p-3 mb-3 bg-primary/5 space-y-2">
                  <input
                    ref={newTaskRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask();
                      if (e.key === "Escape") {
                        setShowNewTask(false);
                        setNewTaskTitle("");
                      }
                    }}
                    placeholder="태스크 제목"
                    className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="text-xs px-2 py-1.5 border border-border rounded-md bg-background"
                    >
                      <option value="P1">P1 (높음)</option>
                      <option value="P2">P2 (중간)</option>
                      <option value="P3">P3 (낮음)</option>
                    </select>
                    <input
                      type="number"
                      placeholder="예상 (분)"
                      value={newTaskEstimate}
                      onChange={(e) => setNewTaskEstimate(e.target.value)}
                      className="text-xs px-2 py-1.5 border border-border rounded-md bg-background w-24"
                    />
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="text-xs px-2 py-1.5 border border-border rounded-md bg-background"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowNewTask(false);
                        setNewTaskTitle("");
                      }}
                      className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}

              {/* 진행 중 태스크 */}
              {pendingTasks.map((task) => (
                <DetailedTaskRow
                  key={task.id}
                  task={task}
                  expanded={expandedTaskId === task.id}
                  onToggle={() => handleToggleTask(task)}
                  onExpand={() =>
                    setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
                  }
                />
              ))}

              {/* 완료 태스크 */}
              {doneTasks.length > 0 && (
                <DoneTasksSection
                  tasks={doneTasks}
                  expandedTaskId={expandedTaskId}
                  onToggle={handleToggleTask}
                  onExpand={(id) =>
                    setExpandedTaskId(expandedTaskId === id ? null : id)
                  }
                />
              )}

              {tasks.length === 0 && !showNewTask && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  아직 태스크가 없어요. 위에서 추가해보세요!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 상세 태스크 행 (데스크탑 전용) ──
function DetailedTaskRow({
  task,
  expanded,
  onToggle,
  onExpand,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const isDone = task.status === "done";
  const priorityBadge = PRIORITY_BADGE[task.priority];
  const statusBadge = TASK_STATUS_BADGE[task.status] || TASK_STATUS_BADGE.todo;

  return (
    <div
      className={cn(
        "border border-border rounded-lg transition-colors",
        isDone && "opacity-50",
        expanded && "bg-muted/20"
      )}
    >
      {/* 메인 행 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className={cn(
            "w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors",
            isDone
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border hover:border-primary/50"
          )}
        >
          {isDone && <Check size={12} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium truncate",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            {task.isRoutine && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-500 font-medium flex items-center gap-0.5">
                <RefreshCw size={8} />
                루틴
              </span>
            )}
          </div>
        </div>

        {/* 배지들 */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              statusBadge.class
            )}
          >
            {statusBadge.label}
          </span>

          {priorityBadge && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                priorityBadge.class
              )}
            >
              {priorityBadge.label}
            </span>
          )}

          {task.estimatedMinutes && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock size={10} />
              {task.estimatedMinutes}분
            </span>
          )}

          {task.dueDate && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar size={10} />
              {task.dueDate.slice(5)}
            </span>
          )}

          <button onClick={onExpand} className="p-0.5 text-muted-foreground">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* 확장된 상세 정보 */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-border mx-4 mt-0 pt-3 space-y-2 text-xs text-muted-foreground">
          {task.description && (
            <div>
              <span className="font-medium text-foreground/70">메모: </span>
              <span className="whitespace-pre-wrap">{task.description}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div>
              <span className="font-medium text-foreground/70">우선순위: </span>
              {task.priority}
            </div>
            <div>
              <span className="font-medium text-foreground/70">상태: </span>
              {statusBadge.label}
            </div>
            {task.estimatedMinutes && (
              <div>
                <span className="font-medium text-foreground/70">예상시간: </span>
                {task.estimatedMinutes}분
              </div>
            )}
            {task.dueDate && (
              <div>
                <span className="font-medium text-foreground/70">마감일: </span>
                {task.dueDate}
              </div>
            )}
            {task.completedAt && (
              <div>
                <span className="font-medium text-foreground/70">완료일: </span>
                {task.completedAt.slice(0, 10)}
              </div>
            )}
            {task.isRoutine && (
              <div>
                <span className="font-medium text-foreground/70">루틴: </span>✅
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 완료 태스크 접기/펼치기 섹션 ──
function DoneTasksSection({
  tasks,
  expandedTaskId,
  onToggle,
  onExpand,
}: {
  tasks: Task[];
  expandedTaskId: string | null;
  onToggle: (task: Task) => void;
  onExpand: (id: string) => void;
}) {
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setShowDone(!showDone)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        {showDone ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        완료됨 ({tasks.length})
      </button>
      {showDone && (
        <div className="space-y-1 mt-1">
          {tasks.map((task) => (
            <DetailedTaskRow
              key={task.id}
              task={task}
              expanded={expandedTaskId === task.id}
              onToggle={() => onToggle(task)}
              onExpand={() => onExpand(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
