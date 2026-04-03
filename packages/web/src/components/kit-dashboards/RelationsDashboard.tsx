import { useEffect, useRef, useState, useMemo } from "react";
import { api, type Relation, type Task } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Users, Cake, CalendarDays, ArrowLeft, MapPin, Calendar, CheckCircle2, Circle, Brain, User, Save, Loader2 } from "lucide-react";

type ViewMode = "dashboard" | "relations" | "appointments" | "relation-detail" | "appointment-detail";

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isBirthdayThisMonth(birthday: string | null): boolean {
  if (!birthday) return false;
  const now = new Date();
  const month = now.getMonth() + 1;
  const parts = birthday.split("-");
  const bMonth = parseInt(parts.length >= 2 ? parts[parts.length - 2] : "0");
  return bMonth === month;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (isThisYear) return `${month}월 ${day}일`;
  return `${d.getFullYear()}년 ${month}월 ${day}일`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const datePart = formatDate(dateStr);
  const hour = d.getHours();
  const min = d.getMinutes();
  const ampm = hour < 12 ? "오전" : "오후";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const minStr = min > 0 ? ` ${min}분` : "";
  return `${datePart} ${ampm} ${h}시${minStr}`;
}

function calculateAge(birthday: string): number | null {
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function parseMemo(memo: string | null): Record<string, any> {
  if (!memo) return {};
  try {
    return JSON.parse(memo);
  } catch {
    return {};
  }
}

// ── Helper: parse description into purpose + review ──
function parseDescription(desc: string | null): { purpose: string; review: string } {
  if (!desc) return { purpose: "", review: "" };
  // "목적: xxx" 패턴이 첫 줄에 있으면 분리
  const match = desc.match(/^(목적:\s*[^\n]*)\n?([\s\S]*)$/);
  if (match) {
    return { purpose: match[1], review: (match[2] || "").trim() };
  }
  return { purpose: "", review: desc.trim() };
}

function buildDescription(purpose: string, review: string): string {
  const parts: string[] = [];
  if (purpose) parts.push(purpose);
  if (review.trim()) parts.push(review.trim());
  return parts.join("\n");
}

function hasReview(desc: string | null): boolean {
  const { review } = parseDescription(desc);
  return review.length > 0;
}

// ── AppointmentDetailView (interactive) ──
function AppointmentDetailView({
  task: initialTask,
  allRelations,
  onBack,
  onTaskUpdated,
}: {
  task: Task;
  allRelations: Relation[];
  onBack: () => void;
  onTaskUpdated?: (updated: Task) => void;
}) {
  const [task, setTask] = useState(initialTask);
  const [reviewText, setReviewText] = useState(() => parseDescription(initialTask.description).review);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { purpose } = parseDescription(initialTask.description);
  const relationIds: string[] = task.relationIds ? JSON.parse(task.relationIds) : [];
  const relatedPeople = allRelations.filter((r) => relationIds.includes(r.id));
  const isDone = task.status === "done";
  const reviewExists = hasReview(task.description);

  async function handleSaveReview() {
    setSaving(true);
    try {
      const newDesc = buildDescription(purpose, reviewText);
      const updated = await api.updateTask(task.id, { description: newDesc || null });
      setTask(updated);
      onTaskUpdated?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save review:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = isDone ? "todo" : "done";
    try {
      const updated = await api.updateTask(task.id, { status: newStatus });
      setTask(updated);
      onTaskUpdated?.(updated);
    } catch (e) {
      console.error("Failed to toggle status:", e);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        돌아가기
      </button>

      {/* Title + Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{task.title}</h3>
        {isDone && (
          reviewExists ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ 후기 있음</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">📝 후기 없음</span>
          )
        )}
      </div>
      <div className="h-px bg-border" />

      {/* Info */}
      <div className="space-y-2.5 text-xs">
        {task.startAt && (
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-blue-500 shrink-0" />
            <span>{formatDateTime(task.startAt)}</span>
          </div>
        )}
        {task.location && (
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-red-500 shrink-0" />
            <span>{task.location}</span>
          </div>
        )}
        {relatedPeople.length > 0 && (
          <div className="flex items-start gap-2">
            <Users size={13} className="text-purple-500 shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {relatedPeople.map((r) => (
                <span
                  key={r.id}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {r.nickname || r.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {purpose && (
          <div className="flex items-start gap-2">
            <span className="shrink-0">🎯</span>
            <span className="text-muted-foreground">{purpose}</span>
          </div>
        )}

        {/* 완료 체크박스 */}
        <button
          onClick={handleToggleStatus}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {isDone ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : (
            <Circle size={16} className="text-muted-foreground" />
          )}
          <span className={isDone ? "text-green-600 font-medium" : "text-muted-foreground"}>
            {isDone ? "완료됨" : "완료로 표시"}
          </span>
        </button>
      </div>

      {/* 후기 section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground">후기</h4>
        <div className="h-px bg-border" />
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="후기를 작성해보세요..."
          rows={4}
          className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <button
          onClick={handleSaveReview}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <><Loader2 size={12} className="animate-spin" /> 저장 중...</>
          ) : saved ? (
            <><CheckCircle2 size={12} /> 저장됨!</>
          ) : (
            <><Save size={12} /> 저장</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── RelationDetailView ──
function RelationDetailView({
  relationId,
  onBack,
  onViewAppointment,
}: {
  relationId: string;
  onBack: () => void;
  onViewAppointment: (task: Task) => void;
}) {
  const [relation, setRelation] = useState<Relation | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allRelations, setAllRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRelation(relationId),
      api.getTasksByRelation(relationId),
      api.getRelations(),
    ])
      .then(([rel, tks, rels]) => {
        setRelation(rel);
        setTasks(tks);
        setAllRelations(rels);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [relationId]);

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;
  }
  if (!relation) {
    return <div className="text-xs text-muted-foreground py-4 text-center">관계를 찾을 수 없어요</div>;
  }

  const memo = parseMemo(relation.memo);
  const memoEntries = Object.entries(memo).filter(([k]) => k !== "notion_page_id");
  const age = relation.birthday ? calculateAge(relation.birthday) : null;
  const lastMetDays = daysSince(relation.lastMetAt);

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        돌아가기
      </button>

      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{relation.nickname || relation.name}</h3>
        {relation.nickname && relation.name !== relation.nickname && (
          <span className="text-xs text-muted-foreground">({relation.name})</span>
        )}
        {relation.relationType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {relation.relationType}
          </span>
        )}
      </div>

      {/* Basic Info */}
      <section>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">기본 정보</h4>
        <div className="h-px bg-border mb-2" />
        <div className="space-y-1.5 text-xs">
          {relation.birthday && (
            <div className="flex items-center gap-2">
              <Cake size={13} className="text-pink-500 shrink-0" />
              <span>
                생일: {formatDate(relation.birthday)}
                {age !== null && ` (만 ${age}세)`}
              </span>
            </div>
          )}
          {memo["거주지"] && (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-blue-500 shrink-0" />
              <span>거주지: {memo["거주지"]}</span>
            </div>
          )}
          {memo["MBTI"] && (
            <div className="flex items-center gap-2">
              <Brain size={13} className="text-purple-500 shrink-0" />
              <span>MBTI: {Array.isArray(memo["MBTI"]) ? memo["MBTI"].join(", ") : memo["MBTI"]}</span>
            </div>
          )}
          {relation.lastMetAt && (
            <div className="flex items-center gap-2">
              <CalendarDays size={13} className="text-green-500 shrink-0" />
              <span>
                마지막 만남: {formatDate(relation.lastMetAt)}
                {lastMetDays !== null && ` (D+${lastMetDays})`}
              </span>
            </div>
          )}
          {/* Other memo fields */}
          {memoEntries
            .filter(([k]) => k !== "거주지" && k !== "MBTI")
            .map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <User size={13} className="text-muted-foreground shrink-0" />
                <span>{key}: {Array.isArray(value) ? value.join(", ") : String(value)}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Appointments */}
      <section>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
          함께한 약속 ({tasks.length}개)
        </h4>
        <div className="h-px bg-border mb-2" />
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">함께한 약속이 없어요</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const taskRelationIds: string[] = t.relationIds ? JSON.parse(t.relationIds) : [];
              const relatedPeople = allRelations.filter(
                (r) => taskRelationIds.includes(r.id) && r.id !== relationId
              );
              return (
                <div
                  key={t.id}
                  onClick={() => onViewAppointment(t)}
                  className="border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.title}</span>
                    {t.status === "done" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                        완료
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    {t.startAt && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(t.startAt)}
                      </span>
                    )}
                    {t.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {t.location}
                      </span>
                    )}
                  </div>
                  {relatedPeople.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {relatedPeople.map((r) => (
                        <span
                          key={r.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {r.nickname || r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function RelationsListView({
  onBack,
  onSelectRelation,
}: {
  onBack: () => void;
  onSelectRelation: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getRelations()
      .then(setRelations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSearching = search.trim().length > 0;

  const filteredRelations = useMemo(() => {
    if (!isSearching) return relations;
    const q = search.trim().toLowerCase();
    return relations.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const nickname = (r.nickname || "").toLowerCase();
      return name.includes(q) || nickname.includes(q);
    });
  }, [relations, search, isSearching]);

  const displayedRelations = isSearching
    ? filteredRelations
    : filteredRelations.slice(0, displayCount);

  const hasMore = !isSearching && displayCount < relations.length;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isSearching) {
        setDisplayCount((prev) => Math.min(prev + 10, relations.length));
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [relations.length, isSearching]);

  // Reset display count when search changes
  useEffect(() => {
    if (!isSearching) setDisplayCount(10);
  }, [isSearching]);

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        돌아가기
      </button>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">👥 관계 리스트</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Plus size={12} />
          인물 추가
        </button>
      </div>

      {showAddForm && (
        <AddForm
          newName={newName}
          setNewName={setNewName}
          newType={newType}
          setNewType={setNewType}
          onAdd={async () => {
            if (!newName.trim()) return;
            await api.createRelation({ name: newName.trim(), relationType: newType || undefined });
            const updated = await api.getRelations();
            setRelations(updated);
            setShowAddForm(false);
            setNewName("");
            setNewType("");
          }}
          onCancel={() => { setShowAddForm(false); setNewName(""); }}
          t={t}
        />
      )}

      <input
        type="text"
        placeholder="검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background mb-3 focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {displayedRelations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {isSearching ? "검색 결과가 없어요" : "등록된 인물이 없어요"}
        </p>
      ) : (
        <div className="space-y-2">
          {displayedRelations.map((r) => (
            <div
              key={r.id}
              onClick={() => onSelectRelation(r.id)}
              className="border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{r.nickname || r.name}</span>
                {r.relationType && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {r.relationType}
                  </span>
                )}
              </div>
              <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                {r.birthday && (
                  <span className="flex items-center gap-1">
                    <Cake size={10} />
                    {r.birthday}
                  </span>
                )}
                {r.lastMetAt && (
                  <span className="flex items-center gap-1">
                    <CalendarDays size={10} />
                    마지막 만남: {r.lastMetAt.slice(0, 10)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={sentinelRef} className="text-xs text-muted-foreground text-center py-2">...</div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentsListView({
  onBack,
  onSelectAppointment,
}: {
  onBack: () => void;
  onSelectAppointment: (task: Task) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allRelations, setAllRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.getTasks({ view: "calendar" }),
      api.getRelations(),
    ])
      .then(([allTasks, rels]) => {
        const appointments = allTasks
          .filter((t) => t.relationIds || t.source === "notion_migration")
          .sort((a, b) => (b.startAt || "").localeCompare(a.startAt || ""));
        setTasks(appointments);
        setAllRelations(rels);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSearching = search.trim().length > 0;

  const filteredTasks = useMemo(() => {
    if (!isSearching) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      // 약속 이름(title)으로 검색
      if ((t.title || "").toLowerCase().includes(q)) return true;
      // 구성원 이름으로 검색
      const relationIds: string[] = t.relationIds ? JSON.parse(t.relationIds) : [];
      const relatedPeople = allRelations.filter((r) => relationIds.includes(r.id));
      return relatedPeople.some((r) => {
        const name = (r.name || "").toLowerCase();
        const nickname = (r.nickname || "").toLowerCase();
        return name.includes(q) || nickname.includes(q);
      });
    });
  }, [tasks, allRelations, search, isSearching]);

  const displayedTasks = isSearching
    ? filteredTasks
    : filteredTasks.slice(0, displayCount);

  const hasMore = !isSearching && displayCount < tasks.length;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isSearching) {
        setDisplayCount((prev) => Math.min(prev + 10, tasks.length));
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [tasks.length, isSearching]);

  // Reset display count when search changes
  useEffect(() => {
    if (!isSearching) setDisplayCount(10);
  }, [isSearching]);

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;
  }

  function getCardStyle(t: Task): { bg: string; badge: React.ReactNode } {
    if (t.status === "done") {
      if (hasReview(t.description)) {
        return {
          bg: "bg-green-50 border-green-200",
          badge: <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">✅ 후기 있음</span>,
        };
      }
      return {
        bg: "bg-yellow-50 border-yellow-200",
        badge: <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">📝 후기 없음</span>,
      };
    }
    return { bg: "border-border", badge: null };
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        돌아가기
      </button>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">📅 약속 리스트</h3>
        <button
          onClick={() => setShowAddAppt(true)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Plus size={12} />
          약속 추가
        </button>
      </div>

      {showAddAppt && (
        <AddAppointmentForm
          onCancel={() => setShowAddAppt(false)}
          onAdd={async (data) => {
            await api.createTask(data);
            const allTasks = await api.getTasks({ view: "calendar" });
            const appointments = allTasks
              .filter((t) => t.relationIds || t.source === "notion_migration")
              .sort((a, b) => (b.startAt || "").localeCompare(a.startAt || ""));
            setTasks(appointments);
            setShowAddAppt(false);
          }}
        />
      )}

      <input
        type="text"
        placeholder="검색... (약속명, 구성원)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background mb-3 focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {displayedTasks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {isSearching ? "검색 결과가 없어요" : "약속이 없어요"}
        </p>
      ) : (
        <div className="space-y-2">
          {displayedTasks.map((t) => {
            const { bg, badge } = getCardStyle(t);
            const relationIds: string[] = t.relationIds ? JSON.parse(t.relationIds) : [];
            const relatedPeople = allRelations.filter((r) => relationIds.includes(r.id));

            return (
              <div
                key={t.id}
                onClick={() => onSelectAppointment(t)}
                className={`border rounded-lg px-3 py-2.5 cursor-pointer hover:opacity-80 transition-all ${bg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t.title}</span>
                  {badge}
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                  {t.startAt && (() => {
                    const d = new Date(t.startAt);
                    const thisYear = new Date().getFullYear();
                    const isThisYear = d.getFullYear() === thisYear;
                    const formatted = d.toLocaleDateString("ko-KR", {
                      ...(isThisYear ? {} : { year: "numeric" }),
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatted}
                      </span>
                    );
                  })()}
                  {t.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {t.location}
                    </span>
                  )}
                </div>
                {relatedPeople.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {relatedPeople.map((r) => (
                      <span
                        key={r.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/70 text-muted-foreground"
                      >
                        {r.nickname || r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && (
            <div ref={sentinelRef} className="text-xs text-muted-foreground text-center py-2">...</div>
          )}
        </div>
      )}
    </div>
  );
}

export function RelationsDashboard() {
  const { t } = useLanguage();
  const [view, setView] = useState<ViewMode>("dashboard");
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("friend");
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [allRelations, setAllRelations] = useState<Relation[]>([]);
  const [appointments, setAppointments] = useState<Task[]>([]);
  const [previousView, setPreviousView] = useState<ViewMode>("dashboard");

  useEffect(() => {
    Promise.all([
      api.getRelations(),
      api.getTasks({ view: "calendar" }),
    ])
      .then(([rels, allTasks]) => {
        setRelations(rels);
        setAllRelations(rels);
        const appts = allTasks
          .filter((t) => t.relationIds || t.source === "notion_migration")
          .sort((a, b) => (b.startAt || "").localeCompare(a.startAt || ""));
        setAppointments(appts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      const created = await api.createRelation({
        name: newName.trim(),
        relation_type: newType,
      } as any);
      setRelations((prev) => [...prev, created]);
      setAllRelations((prev) => [...prev, created]);
      setNewName("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add relation:", err);
    }
  }

  // Subpage views
  if (view === "relation-detail" && selectedRelationId) {
    if (selectedTask) {
      return (
        <AppointmentDetailView
          task={selectedTask}
          allRelations={allRelations}
          onBack={() => setSelectedTask(null)}
        />
      );
    }
    return (
      <RelationDetailView
        relationId={selectedRelationId}
        onBack={() => {
          setView("relations");
          setSelectedRelationId(null);
        }}
        onViewAppointment={(task) => setSelectedTask(task)}
      />
    );
  }
  if (view === "relations") {
    return (
      <RelationsListView
        onBack={() => setView("dashboard")}
        onSelectRelation={(id) => {
          setSelectedRelationId(id);
          setSelectedTask(null);
          setView("relation-detail");
        }}
      />
    );
  }
  if (view === "appointment-detail" && selectedTask) {
    return (
      <AppointmentDetailView
        task={selectedTask}
        allRelations={allRelations}
        onBack={() => {
          setSelectedTask(null);
          setView(previousView);
        }}
        onTaskUpdated={(updated) => setSelectedTask(updated)}
      />
    );
  }
  if (view === "appointments") {
    return (
      <AppointmentsListView
        onBack={() => setView("dashboard")}
        onSelectAppointment={(task) => {
          setSelectedTask(task);
          setPreviousView("appointments");
          setView("appointment-detail");
        }}
      />
    );
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;
  }

  // 빈 상태
  if (relations.length === 0) {
    return (
      <div className="space-y-4">
        {/* 서브페이지 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => setView("relations")}
            className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            👥 관계 리스트
          </button>
          <button
            onClick={() => setView("appointments")}
            className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            📅 약속 리스트
          </button>
        </div>

        <div className="border border-dashed border-border rounded-lg p-6 text-center space-y-3">
          <div className="text-3xl">👥</div>
          <p className="text-sm text-muted-foreground">아직 등록된 인물이 없어요</p>
          <p className="text-xs text-muted-foreground">
            아그에게 "친구 홍길동 등록해줘" 라고 말해보세요
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            직접 추가
          </button>

          {showAddForm && (
            <AddForm
              newName={newName}
              setNewName={setNewName}
              newType={newType}
              setNewType={setNewType}
              onAdd={handleAdd}
              onCancel={() => { setShowAddForm(false); setNewName(""); }}
              t={t}
            />
          )}
        </div>
      </div>
    );
  }

  // 데이터 있을 때 대시보드
  const needContact = relations
    .filter((r) => {
      const days = daysSince(r.lastMetAt);
      return days === null || days >= 30;
    })
    .sort((a, b) => {
      const da = daysSince(a.lastMetAt);
      const db2 = daysSince(b.lastMetAt);
      if (da === null) return -1;
      if (db2 === null) return 1;
      return db2 - da;
    })
    .slice(0, 5);

  const birthdayThisMonth = relations.filter((r) => isBirthdayThisMonth(r.birthday));

  const recentUnreviewed = appointments
    .filter((t) => t.status === "done" && t.startAt && new Date(t.startAt) <= new Date())
    .filter((t) => {
      const desc = t.description || "";
      const stripped = desc.replace(/목적:\s*[^\n]*/g, "").trim();
      return !stripped;
    })
    .sort((a, b) => (b.startAt || "").localeCompare(a.startAt || ""))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 서브페이지 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("relations")}
          className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          👥 관계 리스트
        </button>
        <button
          onClick={() => setView("appointments")}
          className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          📅 약속 리스트
        </button>
      </div>

      {/* 연락 필요한 사람 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-blue-500" />
            <h4 className="text-xs font-semibold text-muted-foreground">연락 필요한 사람</h4>
          </div>
          <button
            onClick={() => setView("relations")}
            className="text-[10px] text-primary hover:underline"
          >
            전체 보기 →
          </button>
        </div>
        {needContact.length === 0 ? (
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">모든 사람과 최근에 연락했어요 🎉</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {needContact.map((r) => {
              const days = daysSince(r.lastMetAt);
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRelationId(r.id);
                    setSelectedTask(null);
                    setView("relation-detail");
                  }}
                  className="border border-border rounded-lg px-3 py-2 text-xs cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="font-medium">{r.nickname || r.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {days === null ? "만남 기록 없음" : `${days}일 전`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 이번 달 생일 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cake size={14} className="text-pink-500" />
            <h4 className="text-xs font-semibold text-muted-foreground">이번 달 생일</h4>
          </div>
          <button
            onClick={() => setView("relations")}
            className="text-[10px] text-primary hover:underline"
          >
            전체 보기 →
          </button>
        </div>
        {birthdayThisMonth.length === 0 ? (
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">이번 달 생일인 사람이 없어요</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {birthdayThisMonth.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRelationId(r.id);
                  setSelectedTask(null);
                  setView("relation-detail");
                }}
                className="border border-border rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <span className="text-xs font-medium">{r.nickname || r.name}</span>
                <span className="text-[10px] text-muted-foreground">{r.birthday}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최근 만남 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-green-500" />
            <h4 className="text-xs font-semibold text-muted-foreground">최근 만남</h4>
          </div>
          <button
            onClick={() => setView("relations")}
            className="text-[10px] text-primary hover:underline"
          >
            전체 보기 →
          </button>
        </div>
        {recentUnreviewed.length === 0 ? (
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">리뷰 없는 만남이 없어요 🎉</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentUnreviewed.map((t) => {
              const d = t.startAt ? new Date(t.startAt) : null;
              const isThisYear = d && d.getFullYear() === new Date().getFullYear();
              const dateStr = d ? d.toLocaleDateString("ko-KR", {
                ...(isThisYear ? {} : { year: "numeric" }),
                month: "short",
                day: "numeric",
              }) : "";
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    setPreviousView("dashboard");
                    setView("appointment-detail");
                  }}
                  className="border border-yellow-200 bg-yellow-50 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-yellow-100 transition-colors"
                >
                  <span className="text-xs font-medium truncate">{t.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{dateStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 다가오는 약속 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" />
            <h4 className="text-xs font-semibold text-muted-foreground">다가오는 약속</h4>
          </div>
          <button
            onClick={() => setView("appointments")}
            className="text-[10px] text-primary hover:underline"
          >
            전체 보기 →
          </button>
        </div>
        {(() => {
          const upcoming = appointments
            .filter((t) => t.status !== "done")
            .sort((a, b) => (a.startAt || "").localeCompare(b.startAt || ""))
            .slice(0, 5);
          if (upcoming.length === 0) {
            return (
              <div className="border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">다가오는 약속이 없어요</p>
              </div>
            );
          }
          return (
            <div className="space-y-1.5">
              {upcoming.map((appt) => {
                const relationIds: string[] = appt.relationIds ? JSON.parse(appt.relationIds) : [];
                const relatedPeople = allRelations.filter((r) => relationIds.includes(r.id));
                return (
                  <div
                    key={appt.id}
                    onClick={() => {
                      setSelectedTask(appt);
                      setPreviousView("dashboard");
                      setView("appointment-detail");
                    }}
                    className="border border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{appt.title}</span>
                      {appt.startAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(appt.startAt)}
                        </span>
                      )}
                    </div>
                    {(appt.location || relatedPeople.length > 0) && (
                      <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                        {appt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {appt.location}
                          </span>
                        )}
                        {relatedPeople.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users size={10} />
                            {relatedPeople.map((r) => r.nickname || r.name).join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>


    </div>
  );
}

function AddForm({
  newName,
  setNewName,
  newType,
  setNewType,
  onAdd,
  onCancel,
  t,
}: {
  newName: string;
  setNewName: (v: string) => void;
  newType: string;
  setNewType: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2 mt-2">
      <input
        autoFocus
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAdd();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={t("relations.enterName")}
        className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <select
        value={newType}
        onChange={(e) => setNewType(e.target.value)}
        className="text-xs px-2 py-1.5 border border-border rounded-md bg-background"
      >
        <option value="friend">{t("relations.friend")}</option>
        <option value="family">{t("relations.family")}</option>
        <option value="lover">{t("relations.lover")}</option>
        <option value="business">{t("relations.business")}</option>
        <option value="other">{t("relations.other")}</option>
      </select>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={onAdd}
          disabled={!newName.trim()}
          className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {t("common.add")}
        </button>
      </div>
    </div>
  );
}

function AddAppointmentForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (data: Partial<Task> & Record<string, any>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const startAt = date ? `${date}T${time || "00:00"}:00` : undefined;
      await onAdd({
        title: title.trim(),
        start_at: startAt,
        location: location.trim() || undefined,
        status: "todo",
        source: "manual",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
      <input
        type="text"
        placeholder="약속 이름 *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <input
        type="text"
        placeholder="장소 (선택)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          {saving ? "저장 중..." : "추가"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground"
        >
          취소
        </button>
      </div>
    </div>
  );
}
