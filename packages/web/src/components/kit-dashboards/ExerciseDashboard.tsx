import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { KitEmptyState } from "./KitEmptyState";

export function ExerciseDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: today, activity_type: "", duration_min: "", calories: "" });

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getExerciseLogs(), api.getExerciseWeeklyStats()])
      .then(([allLogs, stats]) => { setLogs(allLogs); setWeeklyStats(stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activity_type) return;
    setSubmitting(true);
    try {
      await api.createExerciseLog({
        date: form.date,
        activity_type: form.activity_type,
        duration_min: form.duration_min ? Number(form.duration_min) : undefined,
        calories: form.calories ? Number(form.calories) : undefined,
      });
      setForm({ date: today, activity_type: "", duration_min: "", calories: "" });
      setShowForm(false);
      loadData();
    } catch {}
    setSubmitting(false);
  };

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  const addForm = showForm && (
    <form onSubmit={handleSubmit} className="border border-border rounded-lg p-3 space-y-2 mb-4">
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background" />
        <input placeholder="종목 *" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background" required />
        <input type="number" placeholder="시간 (분)" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background" />
        <input type="number" placeholder="칼로리" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setShowForm(false)} className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted">취소</button>
        <button type="submit" disabled={submitting} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{submitting ? "저장 중..." : "저장"}</button>
      </div>
    </form>
  );

  if (logs.length === 0) {
    return (
      <div>
        {addForm}
        {!showForm && <KitEmptyState icon="🏃" example="오늘 벤치프레스 3세트 했어" onAdd={() => setShowForm(true)} />}
      </div>
    );
  }

  const weeklyCount = weeklyStats.reduce((s, r) => s + (r.count ?? 0), 0);
  const weeklyCalories = weeklyStats.reduce((s, r) => s + (r.total_calories ?? 0), 0);
  const recentLogs = [...logs].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 8);

  const lastByType: Record<string, string> = {};
  for (const log of logs) {
    const type = log.activityType || log.activity_type || "기타";
    const date = log.date || "";
    if (!lastByType[type] || date > lastByType[type]) lastByType[type] = date;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">+ 추가</button>
      </div>
      {addForm}

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{weeklyCount}</div>
          <div className="text-[10px] text-muted-foreground">이번 주 운동</div>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">{weeklyCalories.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">소모 칼로리 (kcal)</div>
        </div>
      </div>

      {weeklyStats.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">종목별 (이번 주)</h4>
          <div className="space-y-1.5">
            {weeklyStats.map((s, i) => (
              <div key={i} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-xs font-medium">{s.activity_type}</span>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>{s.count}회</span>
                  {s.total_duration_min && <span>{s.total_duration_min}분</span>}
                  {s.total_calories && <span>{s.total_calories}kcal</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">종목별 마지막 운동일</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(lastByType).map(([type, date]) => {
            const daysAgo = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
            return (
              <div key={type} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <span className="text-xs">{type}</span>
                <span className={`text-[10px] ${daysAgo > 7 ? "text-red-500" : daysAgo > 3 ? "text-yellow-500" : "text-green-500"}`}>
                  {daysAgo === 0 ? "오늘" : `${daysAgo}일 전`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">최근 기록</h4>
        <div className="space-y-1.5">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <span className="text-xs font-medium">{log.activityType || log.activity_type}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{log.date}</span>
              </div>
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                {(log.durationMin || log.duration_min) && <span>{log.durationMin || log.duration_min}분</span>}
                {log.calories && <span>{log.calories}kcal</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
