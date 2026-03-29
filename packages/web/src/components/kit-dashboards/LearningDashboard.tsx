import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function LearningDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLearningLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  if (logs.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">📚 아직 기록이 없어요</p>
        <p className="text-xs text-muted-foreground mt-1">학습 기록을 시작해보세요!</p>
      </div>
    );
  }

  const inProgress = logs.filter((l) => !l.completedAt && !l.completed_at);
  const completed = logs.filter((l) => l.completedAt || l.completed_at);

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{inProgress.length}</div>
          <div className="text-[10px] text-muted-foreground">진행 중</div>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{completed.length}</div>
          <div className="text-[10px] text-muted-foreground">완료</div>
        </div>
      </div>

      {/* 진행 중 */}
      {inProgress.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">진행 중</h4>
          <div className="space-y-1.5">
            {inProgress.slice(0, 5).map((log) => {
              const progress = log.progress ?? 0;
              return (
                <div key={log.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{log.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{log.type}</span>
                  </div>
                  {log.author && <div className="text-[10px] text-muted-foreground">{log.author}</div>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 최근 완료 */}
      {completed.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">최근 완료</h4>
          <div className="space-y-1.5">
            {completed.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs font-medium">{log.title}</div>
                  <div className="text-[10px] text-muted-foreground">{log.type}{log.author ? ` · ${log.author}` : ""}</div>
                </div>
                {log.rating && <span className="text-xs">{"⭐".repeat(log.rating)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
