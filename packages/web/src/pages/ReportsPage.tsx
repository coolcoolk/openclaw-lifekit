import { useEffect, useState, useRef, useCallback } from "react";
import { api, type Report, type Domain } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  X,
  Calendar,
  FileText,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// ── 유틸 ──
function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

function formatWeekRange(start: string, end: string | null) {
  const s = new Date(start + "T00:00:00");
  const e = end ? new Date(end + "T00:00:00") : new Date(s.getTime() + 6 * 86400000);
  const sStr = s.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  const eStr = e.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  return `${sStr} ~ ${eStr}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getMondayOfWeek(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ── 메인 페이지 ──
export function ReportsPage() {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [reports, setReports] = useState<Report[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        api.getReports(tab),
        api.getDomains(),
      ]);
      // 최신순 정렬
      r.sort((a: Report, b: Report) => b.date.localeCompare(a.date));
      setReports(r);
      setDomains(d);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const date = tab === "weekly" ? getMondayOfWeek(getTodayStr()) : getTodayStr();
      const report = await api.generateReport(tab, date);
      setReports((prev) => {
        const filtered = prev.filter((r) => r.id !== report.id);
        return [report, ...filtered];
      });
      setSelectedReport(report);
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpdateReport(id: string, data: Record<string, any>) {
    const updated = await api.updateReport(id, data);
    setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    if (selectedReport?.id === id) setSelectedReport(updated);
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
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">📊 리포트</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          <Sparkles size={16} />
          {generating ? "생성 중..." : "오늘 리포트 생성"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => { setTab("daily"); setSelectedReport(null); }}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            tab === "daily"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar size={14} className="inline mr-1.5 -mt-0.5" />
          일일 리포트
        </button>
        <button
          onClick={() => { setTab("weekly"); setSelectedReport(null); }}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            tab === "weekly"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText size={14} className="inline mr-1.5 -mt-0.5" />
          주간 리포트
        </button>
      </div>

      {/* Report List */}
      {reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">📊</p>
          <p className="text-sm">
            {tab === "daily" ? "일일" : "주간"} 리포트가 없어요. 위에서 생성해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isSelected={selectedReport?.id === report.id}
              onClick={() => setSelectedReport(report)}
            />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedReport && (
        <ReportDetailPanel
          report={selectedReport}
          domains={domains}
          isMobile={isMobile}
          onClose={() => setSelectedReport(null)}
          onUpdate={handleUpdateReport}
        />
      )}
    </div>
  );
}

// ── 리포트 카드 ──
function ReportCard({
  report,
  isSelected,
  onClick,
}: {
  report: Report;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meta = report.meta ? JSON.parse(report.meta) : {};
  const isWeekly = report.type === "weekly";

  return (
    <div
      onClick={onClick}
      className={cn(
        "border rounded-lg px-4 py-3 cursor-pointer transition-all hover:shadow-sm",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isWeekly
              ? formatWeekRange(report.date, report.dateEnd)
              : formatDate(report.date)}
          </span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              report.status === "sent"
                ? "bg-green-500/15 text-green-600"
                : "bg-yellow-500/15 text-yellow-600"
            )}
          >
            {report.status === "sent" ? "발송됨" : "작성 중"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {meta.totalTasks !== undefined && (
            <span>
              {meta.doneTasks ?? 0}/{meta.totalTasks}건 완료
            </span>
          )}
          {meta.completionRate !== undefined && (
            <span>{meta.completionRate}%</span>
          )}
          <ChevronRight size={14} />
        </div>
      </div>
      {report.diary && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
          {report.diary}
        </p>
      )}
    </div>
  );
}

// ── 상세 패널 (PC: 우측 슬라이드인 / 모바일: Bottom Sheet) ──
function ReportDetailPanel({
  report,
  domains,
  isMobile,
  onClose,
  onUpdate,
}: {
  report: Report;
  domains: Domain[];
  isMobile: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, any>) => void;
}) {
  const content = (
    <ReportDetailContent
      report={report}
      domains={domains}
      onClose={onClose}
      onUpdate={onUpdate}
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
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
        {content}
      </div>
    </>
  );
}

// ── 상세 콘텐츠 ──
function ReportDetailContent({
  report,
  domains,
  onClose,
  onUpdate,
}: {
  report: Report;
  domains: Domain[];
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, any>) => void;
}) {
  const [diary, setDiary] = useState(report.diary || "");
  const [nextPlan, setNextPlan] = useState(report.nextPlan || "");
  const meta = report.meta ? JSON.parse(report.meta) : {};
  const isWeekly = report.type === "weekly";
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset when report changes
  useEffect(() => {
    setDiary(report.diary || "");
    setNextPlan(report.nextPlan || "");
  }, [report.id]);

  // Auto-save diary/nextPlan with debounce
  const autoSaveDiary = useCallback(
    (value: string) => {
      setDiary(value);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onUpdate(report.id, { diary: value });
      }, 800);
    },
    [report.id, onUpdate],
  );

  const autoSaveNextPlan = useCallback(
    (value: string) => {
      setNextPlan(value);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onUpdate(report.id, { next_plan: value });
      }, 800);
    },
    [report.id, onUpdate],
  );

  const tasks: any[] = meta.tasks || [];
  const doneTasks = tasks.filter((t: any) => t.status === "done");
  const pendingTasks = tasks.filter((t: any) => t.status !== "done");
  const relationTasks: any[] = meta.relationTasks || [];

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <h2 className="font-semibold text-sm">
          {isWeekly
            ? `주간 리포트 · ${formatWeekRange(report.date, report.dateEnd)}`
            : `일일 리포트 · ${formatDate(report.date)}`}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6" data-bottom-sheet-body>
        {isWeekly ? (
          <WeeklyContent
            meta={meta}
            domains={domains}
            diary={diary}
            nextPlan={nextPlan}
            onDiaryChange={autoSaveDiary}
            onNextPlanChange={autoSaveNextPlan}
          />
        ) : (
          <DailyContent
            tasks={tasks}
            doneTasks={doneTasks}
            pendingTasks={pendingTasks}
            relationTasks={relationTasks}
            diary={diary}
            onDiaryChange={autoSaveDiary}
          />
        )}
      </div>
    </>
  );
}

// ── 일일 리포트 콘텐츠 ──
function DailyContent({
  tasks,
  doneTasks,
  pendingTasks,
  relationTasks,
  diary,
  onDiaryChange,
}: {
  tasks: any[];
  doneTasks: any[];
  pendingTasks: any[];
  relationTasks: any[];
  diary: string;
  onDiaryChange: (val: string) => void;
}) {
  return (
    <>
      {/* 요약 */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          총 {tasks.length}건
        </span>
        <span className="text-green-600 font-medium">
          {doneTasks.length}건 완료
        </span>
        {pendingTasks.length > 0 && (
          <span className="text-yellow-600">
            {pendingTasks.length}건 미완료
          </span>
        )}
      </div>

      {/* 완료 태스크 */}
      {doneTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            완료된 태스크
          </h3>
          <div className="space-y-1">
            {doneTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-green-500/5">
                <span className="text-green-500 text-xs">✓</span>
                <span className="text-sm flex-1 truncate">{t.title}</span>
                {t.domainName && (
                  <span className="text-[10px] text-muted-foreground">{t.domainName}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 미완료 태스크 */}
      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            미완료 태스크
          </h3>
          <div className="space-y-1">
            {pendingTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-yellow-500/5">
                <span className="text-yellow-500 text-xs">○</span>
                <span className="text-sm flex-1 truncate">{t.title}</span>
                {t.priority && t.priority !== "P3" && (
                  <span className="text-[10px] text-muted-foreground">{t.priority}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 약속 (relation_ids 있는 태스크) */}
      {relationTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            오늘 약속
          </h3>
          <div className="space-y-1">
            {relationTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-blue-500/5">
                <span className="text-blue-500 text-xs">👤</span>
                <span className="text-sm flex-1 truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">오늘 등록된 태스크가 없어요</p>
        </div>
      )}

      {/* 일기 */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          일기 / 메모
        </h3>
        <textarea
          value={diary}
          onChange={(e) => onDiaryChange(e.target.value)}
          placeholder="오늘 하루를 기록해보세요..."
          rows={5}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>
    </>
  );
}

// ── 주간 리포트 콘텐츠 ──
function WeeklyContent({
  meta,
  domains,
  diary,
  nextPlan,
  onDiaryChange,
  onNextPlanChange,
}: {
  meta: any;
  domains: Domain[];
  diary: string;
  nextPlan: string;
  onDiaryChange: (val: string) => void;
  onNextPlanChange: (val: string) => void;
}) {
  const domainBalance: Record<string, { name: string; total: number; done: number }> = meta.domainBalance || {};
  const projectProgress: any[] = meta.projectProgress || [];

  // 레이더 차트 데이터
  const radarData = Object.entries(domainBalance).map(([domainId, data]) => ({
    domain: data.name,
    domainId,
    count: data.total,
    fullMark: Math.max(...Object.values(domainBalance).map((d) => d.total), 1),
  }));

  return (
    <>
      {/* 주간 요약 */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          총 {meta.totalTasks ?? 0}건
        </span>
        <span className="text-green-600 font-medium">
          {meta.doneTasks ?? 0}건 완료
        </span>
        {meta.completionRate !== undefined && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              meta.completionRate >= 70
                ? "bg-green-500/15 text-green-600"
                : meta.completionRate >= 40
                  ? "bg-yellow-500/15 text-yellow-600"
                  : "bg-red-500/15 text-red-600"
            )}
          >
            달성률 {meta.completionRate}%
          </span>
        )}
      </div>

      {/* 회고 textarea */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          주간 회고
        </h3>
        <textarea
          value={diary}
          onChange={(e) => onDiaryChange(e.target.value)}
          placeholder="이번 주를 돌아보며..."
          rows={4}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      {/* 레이더 차트 */}
      {radarData.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            도메인별 활동 밸런스
          </h3>
          <div className="border border-border rounded-lg p-3">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e5e5e5" />
                <PolarAngleAxis
                  dataKey="domain"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  tick={{ fontSize: 10, fill: "#a3a3a3" }}
                  axisLine={false}
                />
                <Radar
                  name="태스크 수"
                  dataKey="count"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = DOMAIN_COLORS[payload.domainId] || DOMAIN_COLORS["default"];
                    return (
                      <circle
                        key={payload.domainId}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={color}
                        stroke="white"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e5e5",
                  }}
                  formatter={(value: number) => [`${value}건`, "태스크 수"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 영역별 회고 */}
      {Object.keys(domainBalance).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            영역별 현황
          </h3>
          <div className="space-y-2">
            {Object.entries(domainBalance).map(([domainId, data]) => {
              const domain = domains.find((d) => d.id === domainId);
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              return (
                <div key={domainId} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30">
                  <span className="text-sm">{domain?.icon || "📂"}</span>
                  <span className="text-sm flex-1">{data.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.done}/{data.total}건
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      pct >= 70 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-500"
                    )}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 프로젝트 진행률 */}
      {projectProgress.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            프로젝트 진행
          </h3>
          <div className="space-y-3">
            {projectProgress.map((p: any) => {
              const pct = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.doneTasks}/{p.totalTasks} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 다음 주 계획 */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          다음 주 계획
        </h3>
        <textarea
          value={nextPlan}
          onChange={(e) => onNextPlanChange(e.target.value)}
          placeholder="다음 주에 집중할 것들..."
          rows={4}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>
    </>
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
