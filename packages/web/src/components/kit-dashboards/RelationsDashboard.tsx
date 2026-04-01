import { useEffect, useState } from "react";
import { api, type Relation } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Users, Cake, CalendarDays } from "lucide-react";

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
  // birthday format: YYYY-MM-DD or MM-DD
  const parts = birthday.split("-");
  const bMonth = parseInt(parts.length >= 2 ? parts[parts.length - 2] : "0");
  return bMonth === month;
}

export function RelationsDashboard() {
  const { t } = useLanguage();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("friend");

  useEffect(() => {
    api.getRelations()
      .then(setRelations)
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
      setNewName("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add relation:", err);
    }
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;
  }

  // 빈 상태
  if (relations.length === 0) {
    return (
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

  const recentMet = relations
    .filter((r) => r.lastMetAt)
    .sort((a, b) => (b.lastMetAt || "").localeCompare(a.lastMetAt || ""))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 연락 필요한 사람 */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Users size={14} className="text-blue-500" />
          <h4 className="text-xs font-semibold text-muted-foreground">연락 필요한 사람</h4>
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
                  className="border border-border rounded-lg px-3 py-2 text-xs"
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
        <div className="flex items-center gap-2 mb-2">
          <Cake size={14} className="text-pink-500" />
          <h4 className="text-xs font-semibold text-muted-foreground">이번 달 생일</h4>
        </div>
        {birthdayThisMonth.length === 0 ? (
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">이번 달 생일인 사람이 없어요</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {birthdayThisMonth.map((r) => (
              <div key={r.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium">{r.nickname || r.name}</span>
                <span className="text-[10px] text-muted-foreground">{r.birthday}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최근 만남 */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays size={14} className="text-green-500" />
          <h4 className="text-xs font-semibold text-muted-foreground">최근 만남</h4>
        </div>
        {recentMet.length === 0 ? (
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">만남 기록이 없어요</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentMet.map((r) => (
              <div key={r.id} className="border border-border rounded-lg px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium">{r.nickname || r.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {r.relationType ? t(`relations.${r.relationType}`) : ""}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {r.lastMetAt?.slice(0, 10)} · {r.meetingCount}{t("relations.times")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="pt-2">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs px-4 py-2.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Plus size={14} />
            인물 추가
          </button>
        ) : (
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
