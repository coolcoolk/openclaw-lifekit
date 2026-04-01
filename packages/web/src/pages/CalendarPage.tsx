import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, DatesSetArg } from "@fullcalendar/core";
import koLocale from "@fullcalendar/core/locales/ko";
import { api, type Task, type Domain, type Relation } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import {
  Plus, X, MapPin, Clock, AlignLeft, RefreshCw,
  PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight,
  Copy, Trash2, GripVertical, Check, Users,
} from "lucide-react";

// ── 이벤트 색상 헬퍼 ──
function eventColor(task: Task): string {
  const domainId = task.linkedDomainId || task.domainId;
  if (domainId && DOMAIN_COLORS[domainId]) {
    return DOMAIN_COLORS[domainId];
  }
  return DOMAIN_COLORS["default"];
}

// ── 미니 월간 캘린더 ──
function MiniCalendar({
  selectedDate,
  onDateSelect,
}: {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}) {
  const { t, language } = useLanguage();
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  // 이번 주 범위 계산 (일~토)
  const todayDay = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - todayDay);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const isInCurrentWeek = (d: number) => {
    const date = new Date(year, month, d);
    return date >= weekStart && date <= weekEnd;
  };

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d: number) =>
    d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  return (
    <div className="px-2 pb-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-muted rounded">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium">
          {language === "ko" ? `${year}년 ${month + 1}월` : `${month + 1}/${year}`}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-muted rounded">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {(language === "ko"
          ? ["일", "월", "화", "수", "목", "금", "토"]
          : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
        ).map((d) => (
          <div key={d} className="text-[10px] text-muted-foreground py-0.5">{d}</div>
        ))}
        {days.map((d, i) => (
          <button
            key={i}
            disabled={d === null}
            onClick={() => d && onDateSelect(new Date(year, month, d))}
            className={`text-[11px] py-1 rounded transition-colors ${
              d === null
                ? ""
                : isSelected(d)
                ? "bg-primary text-primary-foreground font-bold"
                : isToday(d)
                ? "bg-primary/10 text-primary font-semibold"
                : isInCurrentWeek(d)
                ? "bg-gray-100 text-foreground hover:bg-gray-200"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {d ?? ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 우선순위 뱃지 색상 ──
const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  P1: { bg: "bg-red-100", text: "text-red-700", label: "P1" },
  P2: { bg: "bg-yellow-100", text: "text-yellow-700", label: "P2" },
  P3: { bg: "bg-gray-100", text: "text-gray-500", label: "P3" },
};

// ── 예상 시간 포맷 ──
function formatEstimatedTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

// ── 날짜 그룹핑 헬퍼 ──
function groupTasksByDate(tasks: Task[], t: (key: string) => string): { label: string; tasks: Task[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Task[]> = {
    today: [],
    yesterday: [],
    older: [],
    noDate: [],
  };

  for (const task of tasks) {
    if (!task.dueDate) {
      groups.noDate.push(task);
    } else {
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due.getTime() === today.getTime()) {
        groups.today.push(task);
      } else if (due.getTime() === yesterday.getTime()) {
        groups.yesterday.push(task);
      } else {
        groups.older.push(task);
      }
    }
  }

  const result: { label: string; tasks: Task[] }[] = [];
  if (groups.today.length > 0) result.push({ label: t("calendar.today"), tasks: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: t("calendar.yesterday"), tasks: groups.yesterday });
  if (groups.older.length > 0) result.push({ label: t("calendar.older"), tasks: groups.older });
  if (groups.noDate.length > 0) result.push({ label: t("calendar.noDate"), tasks: groups.noDate });
  return result;
}

// ── 태스크 탭 콘텐츠 (backlog) ──
function TasksTabContent({
  tasks,
  onToggleComplete,
  completingIds,
  removingIds,
}: {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  completingIds: Set<string>;
  removingIds: Set<string>;
}) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const draggable = new Draggable(el, {
      itemSelector: "[data-event]",
      eventData(eventEl) {
        const raw = eventEl.getAttribute("data-event");
        return raw ? JSON.parse(raw) : {};
      },
    });
    return () => draggable.destroy();
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="px-2 py-6 text-center text-xs text-muted-foreground">
        {t("calendar.noIncompleteTasks")}
      </div>
    );
  }

  const groups = groupTasksByDate(tasks, t);

  return (
    <div ref={containerRef} className="space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-1.5 px-1 mb-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {group.label}
            </span>
            <span className="text-[10px] text-muted-foreground/60">{group.tasks.length}</span>
          </div>
          <div className="space-y-0.5">
            {group.tasks.map((task) => {
              const badge = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.P2;
              const domainColor = task.domainId
                ? (DOMAIN_COLORS[task.domainId] || DOMAIN_COLORS["default"])
                : DOMAIN_COLORS["default"];
              const isRemoving = removingIds.has(task.id);
              return (
                <div
                  key={task.id}
                  data-event={JSON.stringify({
                    title: task.title,
                    duration: task.estimatedMinutes
                      ? `${String(Math.floor(task.estimatedMinutes / 60)).padStart(2, "0")}:${String(task.estimatedMinutes % 60).padStart(2, "0")}`
                      : "01:00",
                    color: domainColor,
                    extendedProps: { taskId: task.id },
                  })}
                  className="flex items-start gap-1.5 px-1.5 py-1.5 rounded-md hover:bg-muted/60 cursor-grab active:cursor-grabbing group transition-colors"
                  style={{
                    borderLeft: `2px solid ${domainColor}`,
                    opacity: isRemoving ? 0 : 1,
                    maxHeight: isRemoving ? 0 : 100,
                    marginBottom: isRemoving ? 0 : undefined,
                    overflow: "hidden",
                    transition: "opacity 0.3s, max-height 0.4s, margin 0.4s",
                  }}
                >
                  <GripVertical size={12} className="shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5" />
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                      completingIds.has(task.id) || task.status === "done"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary hover:bg-primary/10"
                    }`}
                  >
                    {(task.status === "done" || completingIds.has(task.id)) && <Check size={10} className="text-primary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs truncate flex-1">{task.title}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {task.estimatedMinutes && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Clock size={8} />
                          {formatEstimatedTime(task.estimatedMinutes)}
                        </span>
                      )}
                      {task.projectName && (
                        <span className="text-[9px] text-muted-foreground truncate">
                          {task.projectName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 도메인 탭 콘텐츠 ──
function DomainsTabContent({
  domains,
  hiddenDomains,
  onToggleDomain,
  onToggleAll,
}: {
  domains: Domain[];
  hiddenDomains: Set<string>;
  onToggleDomain: (domainId: string) => void;
  onToggleAll: () => void;
}) {
  const { t } = useLanguage();
  const allDomainIds = [...domains.map((d) => d.id), "__none__"];
  const allSelected = allDomainIds.every((id) => !hiddenDomains.has(id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("calendar.domains")}
        </h3>
        <button
          onClick={onToggleAll}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {allSelected ? t("calendar.deselectAll") : t("calendar.selectAll")}
        </button>
      </div>
      {domains.map((d) => (
        <label
          key={d.id}
          className="flex items-center gap-2 px-1 cursor-pointer text-sm"
        >
          <input
            type="checkbox"
            checked={!hiddenDomains.has(d.id)}
            onChange={() => onToggleDomain(d.id)}
            className="rounded"
          />
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: DOMAIN_COLORS[d.id] || DOMAIN_COLORS["default"] }}
          />
          <span className="truncate">{d.icon} {d.name}</span>
        </label>
      ))}
      <label className="flex items-center gap-2 px-1 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={!hiddenDomains.has("__none__")}
          onChange={() => onToggleDomain("__none__")}
          className="rounded"
        />
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: DOMAIN_COLORS["default"] }}
        />
        <span className="truncate">{t("calendar.uncategorized")}</span>
      </label>
    </div>
  );
}

// ── 좌측 사이드바 패널 ──
function CalendarSidebar({
  open,
  domains,
  hiddenDomains,
  onToggleDomain,
  onToggleAll,
  selectedDate,
  onDateSelect,
  sidebarTasks,
  onToggleTaskComplete,
  completingIds,
  removingIds,
}: {
  open: boolean;
  domains: Domain[];
  hiddenDomains: Set<string>;
  onToggleDomain: (domainId: string) => void;
  onToggleAll: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  sidebarTasks: Task[];
  onToggleTaskComplete: (task: Task) => void;
  completingIds: Set<string>;
  removingIds: Set<string>;
}) {
  const [activeTab, setActiveTab] = useState<"tasks" | "domains">("tasks");

  const { t } = useLanguage();

  if (!open) return null;

  return (
    <div className="w-56 shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
      <div className="pt-4 px-3">
        {/* 미니 캘린더 */}
        <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />

        {/* 탭 헤더 */}
        <div className="flex border-b border-border mt-2">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 pb-2 text-xs font-medium text-center transition-colors ${
              activeTab === "tasks"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("calendar.tasks")}
          </button>
          <button
            onClick={() => setActiveTab("domains")}
            className={`flex-1 pb-2 text-xs font-medium text-center transition-colors ${
              activeTab === "domains"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("calendar.domains")}
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="pt-3">
          {activeTab === "tasks" ? (
            <TasksTabContent
              tasks={sidebarTasks}
              onToggleComplete={onToggleTaskComplete}
              completingIds={completingIds}
              removingIds={removingIds}
            />
          ) : (
            <DomainsTabContent
              domains={domains}
              hiddenDomains={hiddenDomains}
              onToggleDomain={onToggleDomain}
              onToggleAll={onToggleAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── datetime-local 변환 헬퍼 ──
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── 모바일 Bottom Sheet 래퍼 ──
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
          maxHeight: "70vh",
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

// ── 이벤트 상세 콘텐츠 (PC/모바일 공용) ──
function EventDetailContent({
  event,
  domains,
  onClose,
  onDelete,
  onDuplicate,
  onUpdate,
}: {
  event: Task;
  domains: Domain[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (event: Task) => void;
  onUpdate: (id: string, data: Record<string, any>) => Promise<void>;
}) {
  const [title, setTitle] = useState(event.title);
  const [startAt, setStartAt] = useState(event.startAt ? toDatetimeLocal(event.startAt) : "");
  const [endAt, setEndAt] = useState(event.endAt ? toDatetimeLocal(event.endAt) : "");
  const [location, setLocation] = useState(event.location || "");
  const [description, setDescription] = useState(event.description || "");
  const [linkedDomainId, setLinkedDomainId] = useState(event.linkedDomainId || event.domainId || "");

  const autoSave = useCallback(
    (field: string, value: string) => {
      const payload: Record<string, any> = {};
      switch (field) {
        case "title":
          if (!value.trim()) return;
          payload.title = value.trim();
          break;
        case "start_at":
          payload.start_at = new Date(value).toISOString();
          break;
        case "end_at":
          payload.end_at = value ? new Date(value).toISOString() : null;
          break;
        case "location":
          payload.location = value.trim() || null;
          break;
        case "description":
          payload.description = value.trim() || null;
          break;
        case "linked_domain_id":
          payload.linked_domain_id = value || null;
          break;
      }
      onUpdate(event.id, payload);
    },
    [event.id, onUpdate],
  );

  const { t } = useLanguage();
  const inputClass = "w-full px-2 py-1.5 text-sm border border-transparent rounded-md bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border focus:outline-none transition-colors";

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => autoSave("title", title)}
          className="font-semibold text-sm bg-transparent border-none outline-none flex-1 mr-2 hover:bg-muted/50 focus:bg-muted/50 rounded px-1 py-0.5"
          placeholder={t("calendar.title")}
        />
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" data-bottom-sheet-body>
        {/* 도메인 선택 */}
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: DOMAIN_COLORS[linkedDomainId] || DOMAIN_COLORS["default"] }}
          />
          <select
            value={linkedDomainId}
            onChange={(e) => {
              setLinkedDomainId(e.target.value);
              autoSave("linked_domain_id", e.target.value);
            }}
            className="text-sm bg-transparent border-none outline-none cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
          >
            <option value="">{t("calendar.uncategorized")}</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* 시간 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={14} className="shrink-0" />
              <span className="text-xs">{t("calendar.start")}</span>
            </div>
            {startAt && (
              <button
                onClick={async () => {
                  setStartAt("");
                  setEndAt("");
                  await onUpdate(event.id, { start_at: null, end_at: null });
                  onClose();
                }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                title={t("calendar.clearTimeTitle")}
              >
                {t("calendar.clearTime")}
              </button>
            )}
          </div>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            onBlur={() => autoSave("start_at", startAt)}
            className={inputClass}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} className="shrink-0" />
            <span className="text-xs">{t("calendar.end")}</span>
          </div>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            onBlur={() => autoSave("end_at", endAt)}
            className={inputClass}
          />
        </div>

        {/* 위치 */}
        <div className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0 text-muted-foreground" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => autoSave("location", location)}
            placeholder={t("calendar.addLocation")}
            className={inputClass}
          />
        </div>

        {/* 설명 */}
        <div className="flex items-start gap-2">
          <AlignLeft size={14} className="mt-2 shrink-0 text-muted-foreground" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => autoSave("description", description)}
            placeholder={t("calendar.addDescription")}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="border-t border-border px-5 py-3 flex gap-2 shrink-0">
        <button
          onClick={() => { onClose(); onDelete(event.id); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={14} />
          {t("calendar.delete")}
        </button>
        <button
          onClick={() => { onDuplicate(event); onClose(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
        >
          <Copy size={14} />
          {t("calendar.duplicate")}
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t("calendar.close")}
        </button>
      </div>
    </>
  );
}

// ── 우측 이벤트 상세 패널 (인라인 편집) ──
function EventDetailPanel({
  event,
  domains,
  isMobile,
  onClose,
  onDelete,
  onDuplicate,
  onUpdate,
}: {
  event: Task;
  domains: Domain[];
  isMobile: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (event: Task) => void;
  onUpdate: (id: string, data: Record<string, any>) => Promise<void>;
}) {
  const detailContent = (
    <EventDetailContent
      event={event}
      domains={domains}
      onClose={onClose}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onUpdate={onUpdate}
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

// ── 새 이벤트 생성 콘텐츠 (PC/모바일 공용) ──
function CreateEventContent({
  initialStart,
  initialEnd,
  domains,
  onClose,
  onCreate,
}: {
  initialStart?: Date;
  initialEnd?: Date;
  domains: Domain[];
  onClose: () => void;
  onCreate: (data: {
    title: string;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
    description: string;
    location: string;
    linked_domain_id: string;
    relation_ids?: string[];
  }) => void;
}) {
  const now = new Date();
  const start = initialStart || now;
  const end = initialEnd || new Date(now.getTime() + 60 * 60 * 1000);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(toDateStr(start));
  const [startTime, setStartTime] = useState(toTimeStr(start));
  const [endDate, setEndDate] = useState(toDateStr(end));
  const [endTime, setEndTime] = useState(toTimeStr(end));
  const [allDay, setAllDay] = useState(false);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [linkedDomainId, setLinkedDomainId] = useState("");
  const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
  const [allRelations, setAllRelations] = useState<Relation[]>([]);
  const { t } = useLanguage();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    api.getRelations().then(setAllRelations).catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const start_at = allDay ? startDate : `${startDate}T${startTime}:00`;
    const end_at = allDay
      ? endDate !== startDate ? endDate : null
      : `${endDate}T${endTime}:00`;

    onCreate({
      title: title.trim(),
      start_at,
      end_at,
      all_day: allDay,
      description: description.trim(),
      location: location.trim(),
      linked_domain_id: linkedDomainId,
      relation_ids: selectedRelationIds.length > 0 ? selectedRelationIds : undefined,
    });
  };

  const inputClass = "w-full px-2 py-1.5 text-sm border border-transparent rounded-md bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border focus:outline-none transition-colors";

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <h2 className="font-semibold text-sm">{t("calendar.newEvent")}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* 본문 */}
      <form id="create-event-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4" data-bottom-sheet-body>
        <input
          ref={titleRef}
          type="text"
          placeholder={t("calendar.eventTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="rounded"
          />
          {t("calendar.allDay")}
        </label>

        {/* 시간 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} className="shrink-0" />
            <span className="text-xs">{t("calendar.start")}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }}
              className={inputClass}
            />
            {!allDay && (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} className="shrink-0" />
            <span className="text-xs">{t("calendar.end")}</span>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
            {!allDay && (
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            )}
          </div>
        </div>

        {/* 위치 */}
        <div className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("calendar.locationOptional")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* 설명 */}
        <div className="flex items-start gap-2">
          <AlignLeft size={14} className="mt-2 shrink-0 text-muted-foreground" />
          <textarea
            placeholder={t("calendar.descriptionOptional")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* 도메인 선택 */}
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: DOMAIN_COLORS[linkedDomainId] || DOMAIN_COLORS["default"] }}
          />
          <select
            value={linkedDomainId}
            onChange={(e) => setLinkedDomainId(e.target.value)}
            className="text-sm bg-transparent border-none outline-none cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
          >
            <option value="">{t("calendar.uncategorized")}</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* 관계 인물 선택 */}
        {allRelations.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={14} className="shrink-0" />
              <span className="text-xs">{t("calendar.relationOptional")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allRelations.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setSelectedRelationIds((prev) =>
                      prev.includes(r.id)
                        ? prev.filter((rid) => rid !== r.id)
                        : [...prev, r.id]
                    )
                  }
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    selectedRelationIds.includes(r.id)
                      ? "bg-pink-100 text-pink-700 border-transparent font-medium"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* 액션 버튼 */}
      <div className="border-t border-border px-5 py-3 flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-md hover:bg-muted transition-colors min-h-[44px]"
        >
          {t("calendar.cancel")}
        </button>
        <div className="flex-1" />
        <button
          type="submit"
          form="create-event-form"
          disabled={!title.trim()}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 min-h-[44px]"
        >
          {t("calendar.create")}
        </button>
      </div>
    </>
  );
}

// ── 새 이벤트 생성 패널 (PC: 우측 슬라이드인, 모바일: Bottom Sheet) ──
function CreateEventPanel({
  initialStart,
  initialEnd,
  domains,
  isMobile,
  onClose,
  onCreate,
}: {
  initialStart?: Date;
  initialEnd?: Date;
  domains: Domain[];
  isMobile: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
    description: string;
    location: string;
    linked_domain_id: string;
    relation_ids?: string[];
  }) => void;
}) {
  const content = (
    <CreateEventContent
      initialStart={initialStart}
      initialEnd={initialEnd}
      domains={domains}
      onClose={onClose}
      onCreate={onCreate}
    />
  );

  if (isMobile) {
    return (
      <MobileBottomSheet open={true} onClose={onClose}>
        {content}
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
        {content}
      </div>
    </>
  );
}

// ── 메인 캘린더 페이지 ──
export function CalendarPage() {
  const [events, setEvents] = useState<Task[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [sidebarTasks, setSidebarTasks] = useState<Task[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStart, setCreateStart] = useState<Date | undefined>();
  const [createEnd, setCreateEnd] = useState<Date | undefined>();
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const dateRangeRef = useRef<{ start: string; end: string } | null>(null);
  const [nowLineTop, setNowLineTop] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const { t, language } = useLanguage();
  const [currentView, setCurrentView] = useState<string>("timeGridWeek");
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenDomains, setHiddenDomains] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ── 삭제 Undo 상태 ──
  const [pendingDelete, setPendingDelete] = useState<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // ── 태스크 완료 애니메이션 상태 ──
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // 도메인 목록 로드
  useEffect(() => {
    api.getDomains().then(setDomains);
  }, []);

  // 사이드바 태스크 로드 (backlog: start_at 없는 미완료 태스크)
  const loadSidebarTasks = useCallback(async () => {
    const data = await api.getBacklogTasks();
    setSidebarTasks(data);
  }, []);

  useEffect(() => {
    loadSidebarTasks();
  }, [loadSidebarTasks]);

  const handleToggleTaskComplete = useCallback(
    async (task: Task) => {
      const newStatus = task.status === "done" ? "todo" : "done";

      if (newStatus === "done") {
        // 즉시 체크마크 표시 (optimistic)
        setCompletingIds((prev) => new Set(prev).add(task.id));
      }

      await api.updateTask(task.id, { status: newStatus });

      if (newStatus === "done") {
        // 1초 후 fade-out 시작
        setTimeout(() => {
          setRemovingIds((prev) => new Set(prev).add(task.id));
          // 0.4초 (transition 시간) 후 목록에서 제거
          setTimeout(() => {
            setCompletingIds((prev) => {
              const next = new Set(prev);
              next.delete(task.id);
              return next;
            });
            setRemovingIds((prev) => {
              const next = new Set(prev);
              next.delete(task.id);
              return next;
            });
            loadSidebarTasks();
          }, 400);
        }, 1000);
      } else {
        loadSidebarTasks();
      }
    },
    [loadSidebarTasks],
  );

  // 캘린더 이벤트 로드 (start_at이 있는 태스크)
  const loadEvents = useCallback(async (start?: string, end?: string) => {
    const data = await api.getCalendarTasks(start, end);
    setEvents(data);
  }, []);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const start = arg.startStr;
      const end = arg.endStr;
      dateRangeRef.current = { start, end };
      setCurrentView(arg.view.type);
      loadEvents(start, end);
      const now = new Date();
      const h = Math.max(0, now.getHours() - 1);
      const scrollTime = `${String(h).padStart(2, "0")}:00:00`;
      setTimeout(() => {
        calendarRef.current?.getApi().scrollToTime(scrollTime);
      }, 100);
    },
    [loadEvents],
  );

  const changeView = useCallback((view: string) => {
    calendarRef.current?.getApi().changeView(view);
  }, []);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      if ((info.jsEvent.target as HTMLElement).closest("button")) return;
      const ev = events.find((e) => e.id === info.event.id);
      if (ev) setSelectedEvent(ev);
    },
    [events],
  );

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setCreateStart(info.start);
    setCreateEnd(info.end);
    setShowCreate(true);
  }, []);

  // 새 이벤트 생성 (tasks API)
  const handleCreate = useCallback(
    async (data: {
      title: string;
      start_at: string;
      end_at: string | null;
      all_day: boolean;
      description: string;
      location: string;
      linked_domain_id: string;
      relation_ids?: string[];
    }) => {
      await api.createTask(data as any);
      setShowCreate(false);
      if (dateRangeRef.current) {
        loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
      }
    },
    [loadEvents],
  );

  const handleDelete = useCallback(
    (id: string) => {
      // 이전 pending 삭제가 있으면 즉시 실행
      setPendingDelete((prev) => {
        if (prev) {
          clearTimeout(prev.timer);
          api.deleteTask(prev.id).then(() => {
            if (dateRangeRef.current) loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
          });
        }
        return null;
      });

      // 토스트 표시 + 3초 타이머 시작
      setToastVisible(true);
      const timer = setTimeout(() => {
        api.deleteTask(id).then(() => {
          if (dateRangeRef.current) loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
        });
        setPendingDelete(null);
        setToastVisible(false);
      }, 3000);

      setPendingDelete({ id, timer });
    },
    [loadEvents],
  );

  const handleUndoDelete = useCallback(() => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
      setPendingDelete(null);
      setToastVisible(false);
      // 이벤트를 다시 보이게 하기 위해 리로드
      if (dateRangeRef.current) {
        loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
      }
    }
  }, [pendingDelete, loadEvents]);

  const handleUpdate = useCallback(
    async (id: string, data: Record<string, any>) => {
      await api.updateTask(id, data as any);
      if (dateRangeRef.current) {
        loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
      }
      loadSidebarTasks();
    },
    [loadEvents, loadSidebarTasks],
  );

  const handleDuplicate = useCallback(
    async (event: Task) => {
      await api.createTask({
        title: `${event.title} (${t("calendar.copy")})`,
        description: event.description,
        start_at: event.startAt,
        end_at: event.endAt,
        all_day: event.allDay,
        location: event.location,
        linked_domain_id: event.linkedDomainId,
      } as any);
      if (dateRangeRef.current) {
        loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
      }
    },
    [loadEvents],
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await api.syncCalendar();
      if (dateRangeRef.current) {
        await loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
      }
    } finally {
      setSyncing(false);
    }
  }, [loadEvents]);

  const handleMiniDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.gotoDate(date);
    }
  }, []);

  // ── 현재 시간 빨간줄 위치 계산 ──
  useEffect(() => {
    const updateNowLine = () => {
      const container = calendarContainerRef.current;
      if (!container) return;

      const slotContainer = container.querySelector(".fc-timegrid-slots");
      if (!slotContainer) { setNowLineTop(null); return; }

      const now = new Date();
      const startHour = 6;  // slotMinTime
      const endHour = 24;   // slotMaxTime
      const totalMinutes = (endHour - startHour) * 60;
      const currentMinutes = (now.getHours() - startHour) * 60 + now.getMinutes();

      if (currentMinutes < 0 || currentMinutes > totalMinutes) {
        setNowLineTop(null);
        return;
      }

      const percent = currentMinutes / totalMinutes;
      const gridRect = slotContainer.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const top = gridRect.top - containerRect.top + gridRect.height * percent;

      setNowLineTop(top);
    };

    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);

    // 스크롤 시에도 위치 업데이트
    const container = calendarContainerRef.current;
    const scroller = container?.querySelector(".fc-scroller");
    if (scroller) {
      scroller.addEventListener("scroll", updateNowLine);
    }

    return () => {
      clearInterval(interval);
      if (scroller) {
        scroller.removeEventListener("scroll", updateNowLine);
      }
    };
  }, [currentView]);

  // External event drop: 사이드바 태스크 → 캘린더에 시간 배정 (PATCH start_at/end_at)
  const handleExternalDrop = useCallback(
    async (info: any) => {
      const raw = info.draggedEl.getAttribute("data-event");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const taskId = parsed.extendedProps?.taskId;

      const startAt = info.date as Date;
      const durationStr = parsed.duration || "01:00";
      const [dH, dM] = durationStr.split(":").map(Number);
      const endAt = new Date(startAt.getTime() + (dH * 60 + dM) * 60 * 1000);

      if (taskId) {
        // 기존 backlog 태스크에 시간 배정
        await api.updateTask(taskId, {
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
        } as any);
      } else {
        // 새 태스크 생성
        await api.createTask({
          title: parsed.title || t("calendar.task"),
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
        } as any);
      }

      if (dateRangeRef.current) {
        loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
      }
      // backlog에서 제거 (시간이 생겼으므로)
      loadSidebarTasks();
    },
    [loadEvents, loadSidebarTasks],
  );

  const toggleDomain = useCallback((domainId: string) => {
    setHiddenDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) next.delete(domainId);
      else next.add(domainId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setHiddenDomains((prev) => {
      const allIds = [...domains.map((d) => d.id), "__none__"];
      const allSelected = allIds.every((id) => !prev.has(id));
      if (allSelected) {
        return new Set(allIds);
      }
      return new Set();
    });
  }, [domains]);

  // 이벤트 필터링 + 색상
  const filteredEvents = events.filter((e) => {
    const domainId = e.linkedDomainId || e.domainId;
    if (domainId != null && domainId !== "") {
      return !hiddenDomains.has(domainId);
    }
    return !hiddenDomains.has("__none__");
  });

  // FullCalendar 이벤트 형식으로 변환
  const pendingDeleteId = pendingDelete?.id;
  const calendarEvents = filteredEvents.map((e) => {
    const color = eventColor(e);
    const isPendingDelete = e.id === pendingDeleteId;
    const classNames = [
      ...(e.status === "done" ? ["opacity-50", "line-through-event"] : []),
      ...(isPendingDelete ? ["opacity-30", "pointer-events-none"] : []),
    ];
    return {
      id: e.id,
      title: e.title,
      start: e.startAt || undefined,
      end: e.endAt || undefined,
      allDay: e.allDay,
      backgroundColor: color,
      borderColor: color,
      textColor: "#ffffff",
      editable: !isPendingDelete,
      extendedProps: { source: e.source, status: e.status },
      classNames,
    };
  });

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border shrink-0 sticky top-0 z-20 bg-background"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3">
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              title={sidebarOpen ? t("calendar.closePanel") : t("calendar.openPanel")}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}
          <h1 className="text-xl md:text-2xl font-bold">
            {t("calendar.calendar")}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {([
              { view: "dayGridMonth", label: t("calendar.monthView") },
              { view: "timeGridWeek", label: t("calendar.weekView") },
              { view: "timeGridDay", label: t("calendar.dayView") },
            ] as const).map(({ view, label }) => (
              <button
                key={view}
                onClick={() => changeView(view)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px] ${
                  currentView === view
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors min-h-[44px] disabled:opacity-50"
            title={t("calendar.syncGoogle")}
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setCreateStart(undefined);
              setCreateEnd(undefined);
              setShowCreate(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <Plus size={16} />
            <span className="hidden md:inline">{t("calendar.newEvent")}</span>
          </button>
        </div>
      </div>

      {/* 사이드바 + 메인 캘린더 */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* 좌측 사이드바 */}
        {!isMobile && (
          <CalendarSidebar
            open={sidebarOpen}
            domains={domains}
            hiddenDomains={hiddenDomains}
            onToggleDomain={toggleDomain}
            onToggleAll={toggleAll}
            selectedDate={selectedDate}
            onDateSelect={handleMiniDateSelect}
            sidebarTasks={sidebarTasks}
            onToggleTaskComplete={handleToggleTaskComplete}
            completingIds={completingIds}
            removingIds={removingIds}
          />
        )}

        {/* 메인 캘린더 영역 */}
        <div className="flex-1 min-w-0 py-2 px-0.5 md:py-6 md:px-4 overflow-y-auto">
          <div ref={calendarContainerRef} className="border border-border rounded-lg p-0.5 md:p-3 bg-background relative">
            {/* 현재 시간 빨간줄 오버레이 */}
            {nowLineTop !== null && (
              <div
                style={{
                  position: "absolute",
                  top: nowLineTop,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: "#ef4444",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -4,
                    top: -4,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                  }}
                />
              </div>
            )}
            <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            longPressDelay={500}
            eventLongPressDelay={500}
            selectLongPressDelay={500}
            scrollTime={(() => {
              const now = new Date();
              const h = Math.max(0, now.getHours() - 1);
              return `${String(h).padStart(2, "0")}:00:00`;
            })()}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "",
            }}
            buttonText={{
              today: t("calendar.today"),
              month: t("calendar.monthView"),
              week: t("calendar.weekView"),
              day: t("calendar.dayView"),
              listWeek: t("calendar.listView"),
            }}
            locales={[koLocale]}
            locale={language === "ko" ? "ko" : "en"}
            firstDay={1}
            events={calendarEvents}
            droppable
            drop={handleExternalDrop}
            selectable
            selectMirror
            editable
            eventResizableFromStart
            nowIndicator={false}
            dayMaxEvents={isMobile ? 2 : 3}
            eventContent={(arg) => {
              const isDone = arg.event.extendedProps.status === "done";
              const viewType = arg.view.type;

              // 월간 뷰: 심플한 dot + 제목 (FullCalendar dayGrid 호환)
              if (viewType === "dayGridMonth") {
                return (
                  <div className="flex items-center gap-1 w-full overflow-hidden px-1 py-0.5" style={{ minWidth: 0 }}>
                    <span
                      className="shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: arg.event.backgroundColor || "#6b7280" }}
                    />
                    <span
                      className={`truncate text-[11px] leading-tight ${isDone ? "line-through opacity-60" : ""}`}
                      style={{ color: "inherit" }}
                    >
                      {arg.event.title}
                    </span>
                  </div>
                );
              }

              // 모바일 주간 뷰: 컴팩트
              if (isMobile && viewType === "timeGridWeek") {
                return (
                  <div
                    className={`w-full h-full overflow-hidden px-0.5 py-px ${isDone ? "opacity-60" : ""}`}
                    style={{ lineHeight: 1.2 }}
                  >
                    <span className={`text-[9px] font-medium break-words ${isDone ? "line-through" : ""}`}
                      style={{ display: "block", wordBreak: "break-all" }}
                    >
                      {arg.event.title}
                    </span>
                  </div>
                );
              }

              // 주간/일간 뷰: 체크박스 + 제목
              return (
                <div className="flex items-center gap-1 px-1 w-full overflow-hidden">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const newStatus = isDone ? "todo" : "done";
                      api.updateTask(arg.event.id, { status: newStatus } as any).then(() => {
                        if (dateRangeRef.current) loadEvents(dateRangeRef.current.start, dateRangeRef.current.end);
                      });
                    }}
                    className="shrink-0 w-3.5 h-3.5 rounded-full border border-white/70 flex items-center justify-center hover:scale-110 transition-transform"
                    style={{ backgroundColor: isDone ? "rgba(255,255,255,0.9)" : "transparent" }}
                  >
                    {isDone && <span style={{ fontSize: 8, color: arg.event.backgroundColor }}>✓</span>}
                  </button>
                  <span className={`truncate text-xs ${isDone ? "line-through opacity-70" : ""}`}>
                    {arg.event.title}
                  </span>
                </div>
              );
            }}
            eventClick={handleEventClick}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            eventDrop={async (info) => {
              await api.updateTask(info.event.id, {
                start_at: info.event.startStr,
                end_at: info.event.endStr,
              } as any);
            }}
            eventResize={async (info) => {
              await api.updateTask(info.event.id, {
                start_at: info.event.startStr,
                end_at: info.event.endStr,
              } as any);
            }}
            allDayText=""
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            snapDuration="00:15:00"
            slotLabelFormat={{
              hour: "numeric",
              hour12: true,
            }}
            height="auto"
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }}
          />
          </div>
        </div>
      </div>

      {/* 이벤트 상세 패널 */}
      {selectedEvent && (
        <EventDetailPanel
          key={selectedEvent.id}
          event={selectedEvent}
          domains={domains}
          isMobile={isMobile}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onUpdate={handleUpdate}
        />
      )}

      {/* 이벤트 생성 패널 */}
      {showCreate && (
        <CreateEventPanel
          initialStart={createStart}
          initialEnd={createEnd}
          domains={domains}
          isMobile={isMobile}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {/* 삭제 Undo 토스트 */}
      <div
        className="fixed bottom-24 left-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg text-sm"
        style={{
          transform: toastVisible ? "translate(-50%, 0)" : "translate(-50%, 80px)",
          opacity: toastVisible ? 1 : 0,
          transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
          pointerEvents: toastVisible ? "auto" : "none",
        }}
      >
        <span>{t("calendar.deleted")}</span>
        <button onClick={handleUndoDelete} className="font-semibold text-blue-400">
          {t("calendar.undo")}
        </button>
      </div>
    </div>
  );
}
