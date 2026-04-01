import { useEffect, useState, useMemo } from "react";

// 주요 타임존 목록
const TIMEZONES = Intl.supportedValuesOf("timeZone");

function TimezoneSelect({ value, onChange, inputClass }: {
  value: string;
  onChange: (tz: string) => void;
  inputClass: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return TIMEZONES.slice(0, 20);
    return TIMEZONES.filter((tz) =>
      tz.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20);
  }, [query]);

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Asia/Seoul"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((tz) => (
            <button
              key={tz}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={() => { onChange(tz); setQuery(tz); setOpen(false); }}
            >
              {tz}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import { api, type Settings, type AiStatus, type Area, type Domain } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { OnboardingModal } from "@/components/OnboardingModal";
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
  Sparkles,
} from "lucide-react";

const MBTI_TYPES = [
  "", "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const inputClass =
  "w-full max-w-full min-w-0 box-border px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors appearance-none";

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
    <section className="border border-border rounded-lg p-5 space-y-4 min-w-0 overflow-hidden">
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
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const PAGES = [
    { value: "tasks", label: t("settings.tasks") },
    { value: "calendar", label: t("nav.calendar") },
    { value: "balance", label: t("nav.balance") },
    { value: "projects", label: t("nav.projects") },
  ];

  useEffect(() => {
    api.getSettings().then(setSettings);
    api.getAreas().then(setAreas);
    api.getDomains().then(setDomains);
    api.getAiStatus().then(setAiStatus).catch(() => setAiStatus({ configured: false, connected: false, adapter: null, gatewayUrl: null }));
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

  const handleReset = async () => {
    if (!confirm(t("settings.resetConfirm"))) return;
    try {
      await fetch("/api/settings/reset", { method: "DELETE" });
      window.location.reload();
    } catch {
      alert(t("settings.resetFailed"));
    }
  };

  const handleLanguageChange = (lang: "ko" | "en") => {
    setLanguage(lang);
    update("dashboard", "language", lang);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-24 space-y-6 overflow-x-hidden">
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
        <div className="grid grid-cols-1 gap-4 min-w-0">
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
            <TimezoneSelect
              value={settings.profile.timezone}
              onChange={(tz) => update("profile", "timezone", tz)}
              inputClass={inputClass}
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
      <SectionCard icon={Clock} title={t("settings.routineTime")}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t("settings.morningBriefing")}</label>
            <input
              type="time"
              className={inputClass}
              value={settings.routine.briefingTime}
              onChange={(e) => update("routine", "briefingTime", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.dailyReview")}</label>
            <input
              type="time"
              className={inputClass}
              value={settings.routine.reviewTime}
              onChange={(e) => update("routine", "reviewTime", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.weeklyReview")}</label>
            <input
              type="time"
              className={inputClass}
              value={(settings.routine as any).weeklyReviewTime ?? "21:00"}
              onChange={(e) => update("routine", "weeklyReviewTime" as any, e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t("settings.weeklyReviewDay")}</label>
            <select
              className={inputClass}
              value={(settings.routine as any).weeklyReviewDay ?? 0}
              onChange={(e) => update("routine", "weeklyReviewDay" as any, Number(e.target.value))}
            >
              {(language === "ko"
                ? ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
                : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
              ).map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 3. AI */}
      <SectionCard icon={Bot} title="AI">
        {aiStatus === null ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0 animate-pulse" />
            <p className="text-sm text-muted-foreground">{t("settings.aiChecking")}</p>
          </div>
        ) : !aiStatus.configured ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
              <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground font-medium">
                  {t("settings.aiSetupRequired")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.aiNotConfigured")}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>{t("settings.aiSetupInstructions")}</p>
              <code className="block mt-2 px-3 py-1.5 bg-background border border-border rounded font-mono text-xs">lifekit init</code>
            </div>
          </div>
        ) : aiStatus.connected ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {t("settings.aiConnected")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.aiConnectedDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {t("settings.aiDisconnected")}
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-500/80">
                {t("settings.aiDisconnectedDesc", { adapter: aiStatus.adapter || "" })}
              </p>
            </div>
          </div>
        )}
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
              <option value={1}>1{t("settings.syncIntervalUnit")}</option>
              <option value={5}>5{t("settings.syncIntervalUnit")}</option>
              <option value={15}>15{t("settings.syncIntervalUnit")}</option>
              <option value={30}>30{t("settings.syncIntervalUnit")}</option>
              <option value={60}>60{t("settings.syncIntervalUnit")}</option>
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

      {/* 데이터 관리 */}
      <SectionCard icon={Database} title={t("settings.dataManagement")}>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Sparkles size={14} />
            온보딩 다시 시작
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Download size={14} />
            {t("settings.exportSettings")}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
          >
            <RotateCcw size={14} />
            {t("settings.resetSettings")}
          </button>
        </div>
      </SectionCard>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
