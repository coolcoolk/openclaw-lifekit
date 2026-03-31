import { useEffect, useState, useRef, useCallback } from "react";
import { api, type Kit } from "@/lib/api";

/* ─── Types ─── */

interface OnboardingModalProps {
  onComplete: () => void;
}

type ChatRole = "ag" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  visible: boolean;
}

type Phase =
  | "intro"
  | "ask-birth"
  | "ask-mbti"
  | "mbti-ei"
  | "mbti-sn"
  | "mbti-tf"
  | "mbti-jp"
  | "mbti-result"
  | "kit"
  | "done";

/* ─── Constants ─── */

const MBTI_STEPS: { phase: Phase; label: string; options: [string, string] }[] = [
  { phase: "mbti-ei", label: "에너지 방향", options: ["E", "I"] },
  { phase: "mbti-sn", label: "인식 기능", options: ["S", "N"] },
  { phase: "mbti-tf", label: "판단 기능", options: ["T", "F"] },
  { phase: "mbti-jp", label: "생활 양식", options: ["J", "P"] },
];

let msgIdCounter = 0;
const nextId = () => `msg-${++msgIdCounter}`;

/* ─── Component ─── */

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [birthDate, setBirthDate] = useState("");
  const [mbtiParts, setMbtiParts] = useState<string[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitIndex, setKitIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── Helpers ─── */

  const addMessages = useCallback(
    (msgs: { role: ChatRole; text: string }[], thenPhase?: Phase) => {
      setShowInput(false);
      msgs.forEach((m, i) => {
        setTimeout(() => {
          const id = nextId();
          setMessages((prev) => [...prev, { ...m, id, visible: false }]);
          // Fade in after a tick
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((p) => (p.id === id ? { ...p, visible: true } : p))
            );
          }, 30);
          // After last message, set phase
          if (i === msgs.length - 1 && thenPhase) {
            setTimeout(() => {
              setPhase(thenPhase);
              setShowInput(true);
            }, 200);
          }
        }, i * 400);
      });
    },
    []
  );

  const addUserMsg = useCallback((text: string) => {
    const id = nextId();
    setMessages((prev) => [...prev, { id, role: "user", text, visible: true }]);
  }, []);

  /* ─── Auto-scroll ─── */

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages, phase, showInput]);

  /* ─── Load kits ─── */

  useEffect(() => {
    api
      .getKits()
      .then((all) => setKits(all.filter((k) => k.installed)))
      .catch(() => {});
  }, []);

  /* ─── Intro flow ─── */

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    addMessages(
      [
        { role: "ag", text: "안녕하세요! 저는 아그예요 🦊\nLifeKit에 오신 것을 환영해요!" },
        { role: "ag", text: "몇 가지 간단한 질문으로 시작해볼게요." },
        { role: "ag", text: "생년월일이 어떻게 되세요? (선택 사항이에요)" },
      ],
      "ask-birth"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Handlers ─── */

  const goToMbtiOrNext = useCallback(() => {
    addMessages(
      [{ role: "ag", text: "MBTI를 알고 계신가요?" }],
      "ask-mbti"
    );
  }, [addMessages]);

  const handleBirthSubmit = useCallback(() => {
    if (birthDate) {
      addUserMsg(birthDate);
    } else {
      addUserMsg("건너뛰기");
    }
    setShowInput(false);
    setTimeout(() => goToMbtiOrNext(), 300);
  }, [birthDate, addUserMsg, goToMbtiOrNext]);

  const handleBirthSkip = useCallback(() => {
    addUserMsg("건너뛰기");
    setBirthDate("");
    setShowInput(false);
    setTimeout(() => goToMbtiOrNext(), 300);
  }, [addUserMsg, goToMbtiOrNext]);

  const startMbtiFlow = useCallback(() => {
    setMbtiParts([]);
    addMessages(
      [{ role: "ag", text: `${MBTI_STEPS[0].label}: 어느 쪽인가요?` }],
      "mbti-ei"
    );
  }, [addMessages]);

  const handleMbtiSkip = useCallback(() => {
    addUserMsg("잘 모르겠어요");
    setShowInput(false);
    setTimeout(() => {
      addMessages(
        [{ role: "ag", text: "괜찮아요, 나중에 알게 되면 알려주세요 😊" }],
        undefined
      );
      // proceed to kits or done
      setTimeout(() => {
        if (kits.length > 0) {
          const kit = kits[0];
          addMessages(
            [
              { role: "ag", text: `${kit.name} Kit이 활성화됐어요 📦` },
              ...(kit.guide ? [{ role: "ag" as ChatRole, text: kit.guide }] : []),
            ],
            "kit"
          );
          setKitIndex(0);
        } else {
          addMessages(
            [{ role: "ag", text: "준비됐어요! 🚀 궁금한 게 있으면 언제든지 말해주세요." }],
            "done"
          );
        }
      }, 600);
    }, 300);
  }, [addUserMsg, addMessages, kits]);

  const handleMbtiSelect = useCallback(
    (option: string) => {
      addUserMsg(option);
      setShowInput(false);
      const newParts = [...mbtiParts, option];
      setMbtiParts(newParts);

      const stepIdx = newParts.length; // next index
      if (stepIdx < 4) {
        setTimeout(() => {
          addMessages(
            [{ role: "ag", text: `${MBTI_STEPS[stepIdx].label}: 어느 쪽인가요?` }],
            MBTI_STEPS[stepIdx].phase
          );
        }, 300);
      } else {
        // All 4 selected
        const mbti = newParts.join("");
        setTimeout(() => {
          addMessages(
            [{ role: "ag", text: `좋아요! ${mbti}군요 😊` }],
            undefined
          );
          setTimeout(() => {
            if (kits.length > 0) {
              const kit = kits[0];
              addMessages(
                [
                  { role: "ag", text: `${kit.name} Kit이 활성화됐어요 📦` },
                  ...(kit.guide ? [{ role: "ag" as ChatRole, text: kit.guide }] : []),
                ],
                "kit"
              );
              setKitIndex(0);
            } else {
              addMessages(
                [{ role: "ag", text: "준비됐어요! 🚀 궁금한 게 있으면 언제든지 말해주세요." }],
                "done"
              );
            }
          }, 600);
        }, 300);
      }
    },
    [mbtiParts, addUserMsg, addMessages, kits]
  );

  const handleKitNext = useCallback(() => {
    addUserMsg("다음 →");
    setShowInput(false);
    const nextIdx = kitIndex + 1;
    if (nextIdx < kits.length) {
      setKitIndex(nextIdx);
      const kit = kits[nextIdx];
      setTimeout(() => {
        addMessages(
          [
            { role: "ag", text: `${kit.name} Kit이 활성화됐어요 📦` },
            ...(kit.guide ? [{ role: "ag" as ChatRole, text: kit.guide }] : []),
          ],
          "kit"
        );
      }, 300);
    } else {
      setTimeout(() => {
        addMessages(
          [{ role: "ag", text: "준비됐어요! 🚀 궁금한 게 있으면 언제든지 말해주세요." }],
          "done"
        );
      }, 300);
    }
  }, [kitIndex, kits, addUserMsg, addMessages]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const update: Record<string, any> = { profile: {} };
      if (birthDate) update.profile.birthDate = birthDate;
      const mbti = mbtiParts.join("");
      if (mbti.length === 4) update.profile.mbti = mbti;
      await api.updateSettings(update as any);
    } catch {}
    try {
      await api.updateSettings({ onboardingCompleted: true } as any);
    } catch {}
    setSaving(false);
    onComplete();
  }, [birthDate, mbtiParts, onComplete]);

  /* ─── Progress ─── */

  const progressPhases: Phase[] = ["intro", "ask-birth", "ask-mbti", "mbti-ei", "mbti-sn", "mbti-tf", "mbti-jp", "mbti-result", "kit", "done"];
  const progressIdx = progressPhases.indexOf(phase);
  const progressPct = Math.min(100, Math.round(((progressIdx + 1) / progressPhases.length) * 100));

  /* ─── Current MBTI step index ─── */

  const currentMbtiStepIdx = MBTI_STEPS.findIndex((s) => s.phase === phase);

  /* ─── Render ─── */

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none px-4 pt-4 pb-2 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">LifeKit 설정 중...</p>
        <div className="h-1 w-full bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex transition-all duration-300 ease-out ${
              msg.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            } ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ag" && (
              <div className="flex-none w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base mr-2 mt-0.5">
                🦊
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "ag"
                  ? "bg-muted text-foreground rounded-tl-md"
                  : "bg-foreground text-background rounded-tr-md"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      {showInput && (
        <div className="flex-none px-4 py-4 border-t border-border bg-background space-y-2 animate-in fade-in duration-200">
          {/* Birth date input */}
          {phase === "ask-birth" && (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
                autoFocus
              />
              <button
                onClick={handleBirthSkip}
                className="px-4 py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                건너뛰기
              </button>
              <button
                onClick={handleBirthSubmit}
                disabled={!birthDate}
                className="px-4 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                확인
              </button>
            </div>
          )}

          {/* MBTI ask */}
          {phase === "ask-mbti" && (
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={startMbtiFlow}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                네, 알고 있어요
              </button>
              <button
                onClick={handleMbtiSkip}
                className="px-5 py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                잘 모르겠어요
              </button>
            </div>
          )}

          {/* MBTI selection steps */}
          {currentMbtiStepIdx >= 0 && (
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                {MBTI_STEPS[currentMbtiStepIdx].label}
              </p>
              <div className="flex items-center gap-3 justify-center">
                {MBTI_STEPS[currentMbtiStepIdx].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleMbtiSelect(opt)}
                    className="w-20 py-3 text-lg font-bold rounded-xl border border-border hover:bg-foreground hover:text-background transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kit next */}
          {phase === "kit" && (
            <div className="flex justify-center">
              <button
                onClick={handleKitNext}
                className="px-6 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                다음 →
              </button>
            </div>
          )}

          {/* Done */}
          {phase === "done" && (
            <div className="flex justify-center">
              <button
                onClick={handleComplete}
                disabled={saving}
                className="px-8 py-3 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? "저장 중..." : "시작하기 →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
