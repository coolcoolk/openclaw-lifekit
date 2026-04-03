import { useEffect, useState } from "react";
import { api, type Relation } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Pencil, Trash2, X, Calendar, Users } from "lucide-react";

const RELATION_TYPES = [
  { value: "lover", icon: "🩷", color: "#ec4899", bg: "bg-pink-100 text-pink-700" },
  { value: "friend", icon: "👥", color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  { value: "family", icon: "👨‍👩‍👧", color: "#22c55e", bg: "bg-green-100 text-green-700" },
  { value: "business", icon: "💼", color: "#f59e0b", bg: "bg-yellow-100 text-yellow-700" },
] as const;

function getTypeInfo(type: string | null) {
  const found = RELATION_TYPES.find((t) => t.value === type);
  return found ?? { value: "other", icon: "👤", color: "#9ca3af", bg: "bg-gray-100 text-gray-600" };
}

interface RelationsKitProps {
  onClose: () => void;
}

export function RelationsKit({ onClose }: RelationsKitProps) {
  const { t } = useLanguage();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    api.getRelations().then((r) => {
      setRelations(r);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all"
    ? relations
    : relations.filter((r) => r.relationType === filter);

  const handleSave = async (data: Record<string, any>) => {
    if (editingRelation?.id) {
      const updated = await api.updateRelation(editingRelation.id, data);
      setRelations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await api.createRelation(data);
      setRelations((prev) => [...prev, created]);
    }
    setEditingRelation(null);
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    await api.deleteRelation(id);
    setRelations((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 md:left-auto md:w-full md:max-w-lg bg-background md:border-l md:border-border z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-pink-500" />
            <h2 className="font-semibold text-sm">💕 {t("relations.title")}</h2>
            <span className="text-xs text-muted-foreground">
              {relations.length}{t("relations.people")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsAdding(true); setEditingRelation(null); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              <Plus size={12} />
              {t("common.add")}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-4 py-3 border-b border-border overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${
              filter === "all"
                ? "bg-foreground text-background border-transparent font-medium"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t("common.all")} ({relations.length})
          </button>
          {RELATION_TYPES.map((rt) => {
            const count = relations.filter((r) => r.relationType === rt.value).length;
            return (
              <button
                key={rt.value}
                onClick={() => setFilter(filter === rt.value ? "all" : rt.value)}
                className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${
                  filter === rt.value
                    ? rt.bg + " border-transparent font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {rt.icon} {t(`relations.${rt.value}`)} ({count})
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                {relations.length === 0 ? t("relations.noRelations") : t("relations.noTypeMatch")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const typeInfo = getTypeInfo(r.relationType);
                return (
                  <div
                    key={r.id}
                    className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{r.name}</span>
                          {r.nickname && (
                            <span className="text-xs text-muted-foreground">({r.nickname})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block px-2 py-0.5 text-[10px] rounded-full font-medium ${typeInfo.bg}`}>
                            {typeInfo.icon} {t(`relations.${r.relationType || "other"}`)}
                          </span>
                          {r.meetingCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {t("relations.meetings")} {r.meetingCount}{t("relations.times")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => { setEditingRelation(r); setIsAdding(false); }}
                          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {/* Detail info */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {r.lastMetAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={11} />
                          {t("relations.lastMet")}: {r.lastMetAt.slice(0, 10)}
                        </div>
                      )}
                      {r.birthday && (
                        <div className="text-xs text-muted-foreground">
                          🎂 {r.birthday}
                        </div>
                      )}
                    </div>
                    {r.memo && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                        {r.memo}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inline Add/Edit Form */}
        {(isAdding || editingRelation) && (
          <RelationForm
            relation={editingRelation}
            onSave={handleSave}
            onCancel={() => { setIsAdding(false); setEditingRelation(null); }}
          />
        )}
      </div>
    </>
  );
}

function RelationForm({
  relation,
  onSave,
  onCancel,
}: {
  relation: Relation | null;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const isNew = !relation?.id;
  const [name, setName] = useState(relation?.name ?? "");
  const [nickname, setNickname] = useState(relation?.nickname ?? "");
  const [relationType, setRelationType] = useState(relation?.relationType ?? "");
  const [birthday, setBirthday] = useState(relation?.birthday ?? "");
  const [memo, setMemo] = useState(relation?.memo ?? "");
  const [lastMetAt, setLastMetAt] = useState(relation?.lastMetAt ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      nickname: nickname.trim() || null,
      relation_type: relationType || null,
      birthday: birthday || null,
      memo: memo.trim() || null,
      last_met_at: lastMetAt || null,
    });
  };

  return (
    <div className="border-t border-border bg-muted/30 p-4 shrink-0">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold">
            {isNew ? t("relations.addRelation") : t("relations.editRelation")}
          </span>
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("relations.enterName")}
            className="col-span-2 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            
          />
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("relations.enterNickname")}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        {/* Type selector */}
        <div className="flex flex-wrap gap-1.5">
          {RELATION_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setRelationType(relationType === rt.value ? "" : rt.value)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                relationType === rt.value
                  ? rt.bg + " border-transparent font-medium"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {rt.icon} {t(`relations.${rt.value}`)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">{t("relations.lastMet")}</label>
            <input
              type="date"
              value={lastMetAt}
              onChange={(e) => setLastMetAt(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">{t("relations.memo")}</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={t("relations.enterMemo")}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-lg hover:bg-muted transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {isNew ? t("common.add") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
