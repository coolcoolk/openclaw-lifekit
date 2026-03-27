import { useEffect, useState } from "react";
import { api, type Task, type Domain, type Area } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Check, Circle, Clock } from "lucide-react";

export function TasksPage() {
  const { t, language } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [filterArea, setFilterArea] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [taskList, domainList, areaList] = await Promise.all([
        api.getTasks(),
        api.getDomains(),
        api.getAreas(),
      ]);
      setTasks(taskList);
      setDomains(domainList);
      setAreas(areaList);
    } finally {
      setLoading(false);
    }
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    const task = await api.createTask({
      title: newTitle,
      areaId: filterArea || undefined,
    } as any);
    setTasks([task, ...tasks]);
    setNewTitle("");
  }

  async function toggleTask(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    const updated = await api.updateTask(task.id, { status: newStatus } as any);
    setTasks(tasks.map((existing) => (existing.id === task.id ? updated : existing)));
  }

  const filteredTasks = filterArea
    ? tasks.filter((task) => task.areaId === filterArea)
    : tasks;

  const todoTasks = filteredTasks.filter((task) => task.status !== "done");
  const doneTasks = filteredTasks.filter((task) => task.status === "done");

  const getAreaName = (areaId: string | null) => {
    if (!areaId) return null;
    const area = areas.find((a) => a.id === areaId);
    return area ? `${area.icon} ${area.name}` : null;
  };

  const priorityColor: Record<string, string> = {
    P1: "text-red-500",
    P2: "text-yellow-500",
    P3: "text-gray-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 md:py-8 md:px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">📋 {t("tasks.title")}</h1>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Clock size={14} />
          <span>
            {t("tasks.remaining", { count: todoTasks.length })} · {t("tasks.completed", { count: doneTasks.length })}
          </span>
        </div>
      </div>

      {/* Area Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterArea("")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs border transition-colors min-h-[36px]",
            !filterArea
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-foreground"
          )}
        >
          {t("common.all")}
        </button>
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              const domainAreas = areas.filter((a) => a.domainId === d.id);
              if (domainAreas.some((a) => a.id === filterArea)) {
                setFilterArea("");
              }
            }}
            className="px-3 py-1.5 rounded-full text-xs border border-border text-muted-foreground min-h-[36px]"
          >
            {d.icon} {d.name}
          </button>
        ))}
      </div>

      {/* Add Task */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder={t("tasks.addNew")}
          className="flex-1 px-3 md:px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={addTask}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 min-h-[44px]"
        >
          <Plus size={16} />
          {t("common.add")}
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-1">
        {todoTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg hover:bg-muted/50 active:bg-muted/50 transition-colors group"
          >
            <button
              onClick={() => toggleTask(task)}
              className="text-muted-foreground hover:text-primary transition-colors p-1 -m-1"
            >
              <Circle size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{task.title}</div>
              {getAreaName(task.areaId) && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {getAreaName(task.areaId)}
                </div>
              )}
            </div>
            <span className={cn("text-xs font-mono", priorityColor[task.priority])}>
              {task.priority}
            </span>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(task.dueDate).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm text-muted-foreground mb-2">
            {t("tasks.done")} ({doneTasks.length})
          </h3>
          <div className="space-y-1 opacity-50">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <button
                  onClick={() => toggleTask(task)}
                  className="text-green-500 p-1 -m-1"
                >
                  <Check size={20} />
                </button>
                <span className="text-sm line-through">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">🎉</p>
          <p className="text-sm">{t("tasks.empty")}</p>
        </div>
      )}
    </div>
  );
}
