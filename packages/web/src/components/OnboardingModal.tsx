import { useEffect, useState, useCallback } from "react";
import { api, type Kit } from "@/lib/api";
import { ChevronRight, Check, Sparkles, Package } from "lucide-react";

type Step = "profile" | "kit" | "done";

interface OnboardingModalProps {
  onComplete: () => void;
}

const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>("profile");
  const [transitioning, setTransitioning] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [mbti, setMbti] = useState("");

  // Kits
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitIndex, setKitIndex] = useState(0);

  // Loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getKits().then((all) => {
      setKits(all.filter((k) => k.installed));
    }).catch(() => {});
  }, []);

  const transition = useCallback((next: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 300);
  }, []);

  const handleProfileSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const update: Record<string, any> = {
        profile: { name: name.trim() } as any,
      };
      if (birthDate) (update.profile as any).birthDate = birthDate;
      if (mbti) (update.profile as any).mbti = mbti;
      await api.updateSettings(update as any);

      if (kits.length > 0) {
        transition("kit");
      } else {
        transition("done");
      }
    } catch {
      // ignore, still proceed
      if (kits.length > 0) transition("kit");
      else transition("done");
    } finally {
      setSaving(false);
    }
  };

  const handleKitNext = () => {
    if (kitIndex < kits.length - 1) {
      setTransitioning(true);
      setTimeout(() => {
        setKitIndex((i) => i + 1);
        setTransitioning(false);
      }, 250);
    } else {
      transition("done");
    }
  };

  const handleComplete = async () => {
    // Mark onboarding as complete by ensuring profile.name is set
    onComplete();
  };

  const totalSteps = 2 + (kits.length > 0 ? 1 : 0);
  const currentStep = step === "profile" ? 1 : step === "kit" ? 2 : totalSteps;

  const currentKit = kits[kitIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`
          relative w-full max-w-md mx-4 bg-background rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-300 ease-out
          ${transitioning ? "opacity-0 scale-95 translate-y-2" : "opacity-100 scale-100 translate-y-0"}
        `}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < currentStep ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pb-6">
          {/* ── Step 1: Profile ── */}
          {step === "profile" && (
            <div className="space-y-5">
              <div className="pt-4 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-2">
                  <Sparkles className="w-7 h-7 text-foreground" />
                </div>
                <h2 className="text-xl font-bold">LifeKit에 오신 것을 환영해요 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  먼저 간단한 프로필을 설정해볼까요?
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">이름 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
                    autoFocus
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    생년월일 <span className="text-muted-foreground font-normal">(선택)</span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
                  />
                </div>

                {/* MBTI */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    MBTI <span className="text-muted-foreground font-normal">(선택)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {MBTI_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMbti(mbti === type ? "" : type)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                          mbti === type
                            ? "bg-foreground text-background border-foreground"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleProfileSave}
                disabled={!name.trim() || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? "저장 중..." : "다음"}
                {!saving && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* ── Step 2: Kit onboarding ── */}
          {step === "kit" && currentKit && (
            <div className="space-y-5">
              <div className="pt-4 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-2">
                  <Package className="w-7 h-7 text-foreground" />
                </div>
                <h2 className="text-xl font-bold">{currentKit.name} Kit이 활성화됐어요! 📦</h2>
                {currentKit.guide && (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {currentKit.guide}
                  </p>
                )}
              </div>

              <div className="bg-muted rounded-xl p-4 space-y-2">
                <p className="text-sm leading-relaxed">
                  이제 <strong>{currentKit.name}</strong>을 어떻게 사용하는지 알려드릴게요.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  기록을 시작하려면 아그에게 직접 말하거나,<br />
                  프로젝트 탭의 <strong>{currentKit.name}</strong>을 클릭하세요.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{kitIndex + 1} / {kits.length} Kits</span>
              </div>

              <button
                onClick={handleKitNext}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                {kitIndex < kits.length - 1 ? "다음" : "완료"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div className="space-y-5">
              <div className="pt-6 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-foreground text-background mb-2">
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
                <h2 className="text-xl font-bold">준비 완료! 🚀</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  LifeKit이 준비됐어요.<br />
                  궁금한 게 있으면 언제든 아그에게 말씀해주세요.
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                시작하기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
