import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const EXPENSE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  fixed: { label: "고정비", color: "bg-blue-100 text-blue-700" },
  normal: { label: "일반", color: "bg-gray-100 text-gray-700" },
  impulse: { label: "홧김", color: "bg-orange-100 text-orange-700" },
  stupid: { label: "멍청비용", color: "bg-red-100 text-red-700" },
};

export function FinanceDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    Promise.all([
      api.getFinanceSummary(month),
      api.getFinanceExpenses(),
    ])
      .then(([sum, expenses]) => {
        setSummary(sum);
        setRecentExpenses(expenses.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  if (!summary || (summary.expense_count === 0 && summary.income_count === 0)) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">💰 아직 기록이 없어요</p>
        <p className="text-xs text-muted-foreground mt-1">지출을 기록해보세요!</p>
      </div>
    );
  }

  const totalExpense = summary.total_expense ?? 0;
  const totalIncome = summary.total_income ?? 0;
  const byCategory = summary.byCategory ?? [];

  return (
    <div className="space-y-4">
      {/* 이번 달 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-red-500">-{totalExpense.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">이번 달 지출</div>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-500">+{totalIncome.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">이번 달 수입</div>
        </div>
      </div>

      {/* 카테고리별 지출 */}
      {byCategory.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">유형별 지출</h4>
          <div className="space-y-1.5">
            {byCategory.map((cat: any, i: number) => {
              const typeInfo = EXPENSE_TYPE_LABELS[cat.expense_type] || { label: cat.expense_type || cat.category || "기타", color: "bg-gray-100 text-gray-600" };
              const pct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
              return (
                <div key={i} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      {cat.category && <span className="text-[10px] text-muted-foreground">{cat.category}</span>}
                    </div>
                    <span className="text-xs font-medium">{cat.total.toLocaleString()}원</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 최근 지출 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">최근 내역</h4>
        <div className="space-y-1">
          {recentExpenses.map((exp) => {
            const isExpense = exp.type === "expense";
            return (
              <div key={exp.id} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{exp.memo || exp.category || "내역 없음"}</div>
                  <div className="text-[10px] text-muted-foreground">{exp.date}</div>
                </div>
                <span className={`text-xs font-medium shrink-0 ${isExpense ? "text-red-500" : "text-green-500"}`}>
                  {isExpense ? "-" : "+"}{(exp.amount ?? 0).toLocaleString()}원
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
