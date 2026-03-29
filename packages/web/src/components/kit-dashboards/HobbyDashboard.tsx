import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function HobbyDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getHobbyProjects(),
      api.getHobbyLogs(),
    ])
      .then(([p, l]) => { setProjects(p); setLogs(l); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  if (projects.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">🎯 아직 기록이 없어요</p>
        <p className="text-xs text-muted-foreground mt-1">취미 프로젝트를 시작해보세요!</p>
      </div>
    );
  }

  const active = projects.filter((p) => p.status === "active");
  const completed = projects.filter((p) => p.status === "completed");
  const recentLogs = [...logs].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{active.length}</div>
          <div className="text-[10px] text-muted-foreground">진행 중</div>
        </div>
        <div className="border border-border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{completed.length}</div>
          <div className="text-[10px] text-muted-foreground">완료</div>
        </div>
      </div>

      {/* 진행 중인 프로젝트 */}
      {active.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">진행 중인 프로젝트</h4>
          <div className="space-y-1.5">
            {active.map((p) => (
              <div key={p.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {p.icon && <span>{p.icon}</span>}
                  <span className="text-xs font-medium">{p.name}</span>
                </div>
                {p.memo && <p className="text-[10px] text-muted-foreground mt-1">{p.memo}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 활동 로그 */}
      {recentLogs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">최근 활동</h4>
          <div className="space-y-1.5">
            {recentLogs.map((log) => {
              const project = projects.find((p) => p.id === (log.projectId || log.project_id));
              return (
                <div key={log.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs font-medium">{log.content || "활동 기록"}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {project?.name || "프로젝트"} · {log.date}
                    </div>
                  </div>
                  {(log.durationMin || log.duration_min) && (
                    <span className="text-[10px] text-muted-foreground">{log.durationMin || log.duration_min}분</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
