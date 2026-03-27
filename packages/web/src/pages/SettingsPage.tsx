import { useEffect, useState } from "react";
import { api, type Settings, type Area, type Domain } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  User,
  Clock,
  Bot,
  Calendar,
  Bell,
  LayoutDashboard,
  Layers,
  Database,
  Info,
  Save,
  RotateCcw,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react";

const MBTI_TYPES = [
  "", "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const inputClass =
  "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors";

const labelClass = "block text-sm font-medium text-foreground mb-1";

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border rounded-lg p-5 space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Icon size={18} className="text-muted-foreground" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const PAGES = [
    { value: "tasks", label: t("nav.calendar") === "Calendar" ? "Tasks" : "태스크" },
    { value: "calendar", label: t("nav.calendar") },
    { value: "balance", label: t("nav.balance") },
    { value: "projects", label: t("nav.projects") },
  ];

  useEffect(() => {
    api.getSettings().then(setSettings);
    api.getAreas().then(setAreas);
    api.getDomains().then(setDomains);
  }, []);

  if (!settings) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const update = (section: keyof Settings, field: string, value: any) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: { ...prev[section], [field]: value },
      };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const data = {
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifekit-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!confirm(t("settings.resetConfirm"))) return;
    alert(t("settings.resetFuture"));
  };

  const handleLanguageChange = (lang: "ko" | "en") => {
    setLanguage(lang);
    update("dashboard", "language", lang);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? t("common.saving") : saved ? t("common.saved") : t("common.save")}
        </button>
      </div>

      {/* 1. 프로필 */}
      <SectionCard icon={User} title={t("settings.profile")}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>{t("settings.name")}</label>
            <input
              className={inputClass}
              value={settings.profile.name}
              onChange={(e) => update("profile", "name", e.target.value)}
              placeholder={t("settings.namePlace")}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.birthDate")}</label>
            <input
              type="date"
              className={inputClass}
              value={settings.profile.birthDate}
              onChange={(e) => update("profile", "birthDate", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.timezone")}</label>
            <input
              className={inputClass}
              value={settings.profile.timezone}
              onChange={(e) => update("profile", "timezone", e.target.value)}
              placeholder="Asia/Seoul"
            />
          </div>
          <div>
            <label className={labelClass}>MBTI</label>
            <select
              className={inputClass}
              value={settings.profile.mbti}
              onChange={(e) => update("profile", "mbti", e.target.value)}
            >
              {MBTI_TYPES.map((mbti) => (
                <option key={mbti} value={mbti}>
                  {mbti || t("common.none")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 2. 브리핑/회고 시간 */}
      <SectionCard icon={Clock} title="브리핑/회고 시간">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>모닝 브리핑</label>
            <input
              type="time"
              className={inputClass}
              value={settings.routine.briefingTime}
              onChange={(e) => update("routine", "briefingTime", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>일일 회고</label>
            <input
              type="time"
              className={inputClass}
              value={settings.routine.reviewTime}
              onChange={(e) => update("routine", "reviewTime", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>주간 회고</label>
            <input
              type="time"
              className={inputClass}
              value={(settings.routine as any).weeklyReviewTime ?? "21:00"}
              onChange={(e) => update("routine", "weeklyReviewTime" as any, e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      {/* 3. AI */}
      <SectionCard icon={Bot} title="AI">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium">OpenClaw 연결됨</p>
            <p className="text-xs text-muted-foreground">아그(Claude Sonnet)가 LifeKit AI를 처리합니다</p>
          </div>
        </div>
      </SectionCard>

      {/* 4. 구글 캘린더 */}
      <SectionCard icon={Calendar} title={t("settings.googleCalendar")}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.connectionStatus")}</p>
              <p className="text-xs text-muted-foreground">
                {settings.googleCalendar.connected ? t("settings.connected") : t("settings.disconnected")}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                settings.googleCalendar.connected
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {settings.googleCalendar.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div>
            <label className={labelClass}>{t("settings.syncInterval")}</label>
            <select
              className={inputClass}
              value={settings.googleCalendar.syncIntervalMin}
              onChange={(e) =>
                update("googleCalendar", "syncIntervalMin", Number(e.target.value))
              }
            >
              <option value={1}>1{language === "ko" ? "분" : " min"}</option>
              <option value={5}>5{language === "ko" ? "분" : " min"}</option>
              <option value={15}>15{language === "ko" ? "분" : " min"}</option>
              <option value={30}>30{language === "ko" ? "분" : " min"}</option>
              <option value={60}>60{language === "ko" ? "분" : " min"}</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 5. 알림 */}
      <SectionCard icon={Bell} title={t("settings.notifications")}>
        <div className="space-y-3">
          {[
            { key: "briefing" as const, label: t("settings.briefingNotif") },
            { key: "review" as const, label: t("settings.reviewNotif") },
            { key: "taskReminder" as const, label: t("settings.taskReminder") },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm">{label}</span>
              <Toggle
                checked={settings.notifications[key]}
                onChange={(v) => update("notifications", key, v)}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 6. 대시보드 */}
      <SectionCard icon={LayoutDashboard} title={t("settings.dashboard")}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t("settings.defaultPage")}</label>
            <select
              className={inputClass}
              value={settings.dashboard.defaultPage}
              onChange={(e) => update("dashboard", "defaultPage", e.target.value)}
            >
              {PAGES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t("settings.theme")}</label>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => update("dashboard", "theme", th)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    settings.dashboard.theme === th
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {th === "light" ? t("settings.light") : th === "dark" ? t("settings.dark") : t("settings.system")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 언어 */}
      <SectionCard icon={Globe} title={t("settings.language")}>
        <div className="flex gap-2">
          {(["ko", "en"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                (settings.dashboard.language || language) === lang
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              {lang === "ko" ? t("settings.korean") : t("settings.english")}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 9. LifeKit 정보 */}
      <SectionCard icon={Info} title={t("settings.info")}>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("settings.version")}</span>
            <span className="font-mono">0.1.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("settings.engine")}</span>
            <span className="font-mono">OpenClaw Power Layer</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
