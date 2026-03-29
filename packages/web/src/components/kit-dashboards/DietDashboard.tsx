import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { KitEmptyState } from "./KitEmptyState";

const MEAL_LABELS: Record<string, string> = {
  breakfast: "🌅 아침",
  lunch: "☀️ 점심",
  dinner: "🌙 저녁",
  snack: "🍪 간식",
};

const MEAL_OPTIONS = [
  { value: "breakfast", label: "아침" },
  { value: "lunch", label: "점심" },
  { value: "dinner", label: "저녁" },
  { value: "snack", label: "간식" },
];

export function DietDashboard() {
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: today, meal_type: "lunch", food_name: "", calories: "" });

  const loadData = () => {
    setLoading(true);
    const todayStr = new Date().toISOString().split("T")[0];
    const promises: Promise<any>[] = [api.getDietLogs(todayStr), api.getDietSummary(todayStr)];
    const weekPromises: Promise<any>[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      weekPromises.push(api.getDietSummary(dateStr).then((s) => ({ date: dateStr, ...s })));
    }
    Promise.all([...promises, Promise.all(weekPromises)])
      .then(([logs, sum, week]) => { setTodayLogs(logs); setSummary(sum); setWeeklyData(week); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.food_name) return;
    setSubmitting(true);
    try {
      await api.createDietLog({
        date: form.date,
        meal_type: form.meal_type,
        food_name: form.food_name,
        calories: form.calories ? Number(form.calories) : undefined,
      });
      setForm({ date: today, meal_type: "lunch", food_name: "", calories: "" });
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
        <select value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background">
          {MEAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input placeholder="음식명 *" value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background" required />
        <input type="number" placeholder="칼로리" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="text-xs border border-border rounded px-2 py-1.5 bg-background" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setShowForm(false)} className="text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:bg-muted">취소</button>
        <button type="submit" disabled={submitting} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{submitting ? "저장 중..." : "저장"}</button>
      </div>
    </form>
  );

  const totalCal = summary?.total_calories ?? 0;
  const goalCal = 2000;
  const pct = Math.min((totalCal / goalCal) * 100, 100);
  const maxWeeklyCal = Math.max(...weeklyData.map((d) => d.total_calories ?? 0), 1);

  if (todayLogs.length === 0 && weeklyData.every((d) => !d.total_calories)) {
    return (
      <div>
        {addForm}
        {!showForm && <KitEmptyState icon="🍽️" example="점심에 김치찌개 먹었어" onAdd={() => setShowForm(true)} />}
      </div>
    );
  }

  const byMeal: Record<string, any[]> = {};
  todayLogs.forEach((log) => {
    const key = log.mealType || log.meal_type || "snack";
    if (!byMeal[key]) byMeal[key] = [];
    byMeal[key].push(log);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">+ 추가</button>
      </div>
      {addForm}

      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">오늘 칼로리</span>
          <span className="text-sm font-bold">{totalCal.toLocaleString()} / {goalCal.toLocaleString()} kcal</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
        </div>
        {summary && (
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>단백질 {summary.total_protein ?? 0}g</span>
            <span>탄수화물 {summary.total_carbs ?? 0}g</span>
            <span>지방 {summary.total_fat ?? 0}g</span>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">오늘 식단</h4>
        {todayLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">오늘 기록된 식단이 없어요</p>
        ) : (
          <div className="space-y-2">
            {["breakfast", "lunch", "dinner", "snack"].map((meal) => {
              const items = byMeal[meal];
              if (!items) return null;
              return (
                <div key={meal} className="border border-border rounded-lg p-3">
                  <div className="text-xs font-medium mb-1">{MEAL_LABELS[meal] || meal}</div>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span>{item.foodName || item.food_name}</span>
                      <span className="text-muted-foreground">{item.calories ?? "-"} kcal</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">주간 칼로리 추이</h4>
        <div className="flex items-end gap-1 h-20">
          {weeklyData.map((d, i) => {
            const cal = d.total_calories ?? 0;
            const h = maxWeeklyCal > 0 ? (cal / maxWeeklyCal) * 100 : 0;
            const dayLabel = new Date(d.date).toLocaleDateString("ko-KR", { weekday: "short" });
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground">{cal > 0 ? cal : ""}</span>
                <div className="w-full bg-muted rounded-sm overflow-hidden" style={{ height: "60px" }}>
                  <div className="w-full bg-green-400 rounded-sm transition-all duration-300" style={{ height: `${h}%`, marginTop: `${100 - h}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
