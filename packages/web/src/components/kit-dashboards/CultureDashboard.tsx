import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function CultureDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCultureLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  if (logs.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">🎭 아직 기록이 없어요</p>
        <p className="text-xs text-muted-foreground mt-1">영화, 공연, 전시 등을 기록해보세요!</p>
      </div>
    );
  }

  const sortedLogs = [...logs].sort((a, b) => (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || ""));

  // 유형별 카운트
  const byType: Record<string, number> = {};
  logs.forEach((l) => { byType[l.type] = (byType[l.type] || 0) + 1; });

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="border border-border rounded-lg px-3 py-2 text-center">
            <div className="text-sm font-bold">{count}</div>
            <div className="text-[10px] text-muted-foreground">{type}</div>
          </div>
        ))}
      </div>

      {/* 최근 감상 기록 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">최근 감상 기록</h4>
        <div className="space-y-1.5">
          {sortedLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{log.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {log.type} · {log.date}
                  </div>
                </div>
                {log.rating && <span className="text-xs shrink-0">{"⭐".repeat(log.rating)}</span>}
              </div>
              {log.review && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{log.review}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
