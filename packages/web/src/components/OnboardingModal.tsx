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
  | "mbti-input"
  | "kit-intro"
  | "kit-q"
  | "done";

/* ─── Kit Question Definitions ─── */

interface KitQuestion {
  message: string;
  field: string;
  type: "choice" | "text";
  choices?: string[];
  /** Value mapping: display label → stored value */
  valueMap?: Record<string, string>;
  /** Shortcut button for text inputs (e.g. "없어요") */
  skipButton?: string;
  skipValue?: string;
}

interface KitFlow {
  emoji: string;
  questions: KitQuestion[];
}

const KIT_FLOWS: Record<string, KitFlow> = {
  diet: {
    emoji: "🥗",
    questions: [
      {
        message: "식사를 어떤 수준으로 기록하고 싶으세요?",
        field: "trackingLevel",
        type: "choice",
        choices: ["간단히 (뭘 먹었는지만)", "상세히 (칼로리, 영양소 포함)"],
        valueMap: {
          "간단히 (뭘 먹었는지만)": "simple",
          "상세히 (칼로리, 영양소 포함)": "detailed",
        },
      },
      {
        message: "혹시 식이 제한이 있으신가요? (채식, 글루텐프리 등)",
        field: "restrictions",
        type: "text",
        skipButton: "없어요",
        skipValue: "없음",
      },
    ],
  },
  exercise: {
    emoji: "💪",
    questions: [
      {
        message: "주로 어떤 운동을 하세요?",
        field: "types",
        type: "text",
      },
      {
        message: "일주일에 몇 번 정도 운동하세요?",
        field: "frequency",
        type: "choice",
        choices: ["1-2회", "3-4회", "5회 이상", "불규칙하게"],
      },
    ],
  },
  finance: {
    emoji: "💰",
    questions: [
      {
        message: "지출을 얼마나 상세하게 기록하고 싶으세요?",
        field: "trackingLevel",
        type: "choice",
        choices: ["간단히 (큰 항목만)", "상세히 (모든 지출)"],
        valueMap: {
          "간단히 (큰 항목만)": "simple",
          "상세히 (모든 지출)": "detailed",
        },
      },
    ],
  },
  relations: {
    emoji: "🤝",
    questions: [
      {
        message: "주로 어떤 관계를 기록하고 싶으세요?",
        field: "focus",
        type: "choice",
        choices: ["가족/친구", "직장/비즈니스", "모두"],
      },
    ],
  },
};

let msgIdCounter = 0;
const nextId = () => `msg-${++msgIdCounter}`;

/* ─── Component ─── */

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [birthDate, setBirthDate] = useState("");
  const [mbti, setMbti] = useState("");
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitIndex, setKitIndex] = useState(0);
  const [kitQuestionIndex, setKitQuestionIndex] = useState(0);
  const [kitPreferences, setKitPreferences] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [textInput, setTextInput] = useState("");

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
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((p) => (p.id === id ? { ...p, visible: true } : p))
            );
          }, 30);
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

  /* ─── Kit flow helpers ─── */

  /** Get the KitFlow for a given kit, if one exists */
  const getKitFlow = useCallback((kit: Kit): KitFlow | null => {
    // Match by nameEn (lowercase) or id
    const key = kit.id ?? kit.nameEn?.toLowerCase();
    return KIT_FLOWS[key] ?? null;
  }, []);

  /** Start the question flow for a given kit index */
  const startKitQuestions = useCallback(
    (idx: number) => {
      if (idx >= kits.length) {
        // All kits done
        addMessages(
          [{ role: "ag", text: "준비됐어요! 🚀 궁금한 게 있으면 언제든지 말해주세요." }],
          "done"
        );
        return;
      }

      const kit = kits[idx];
      const flow = getKitFlow(kit);
      const emoji = flow?.emoji ?? "📦";

      setKitIndex(idx);
      setKitQuestionIndex(0);

      if (flow && flow.questions.length > 0) {
        // Kit with custom questions
        addMessages(
          [
            { role: "ag", text: `${kit.name} Kit이 활성화됐어요 ${emoji}` },
            { role: "ag", text: flow.questions[0].message },
          ],
          "kit-q"
        );
      } else {
        // Unknown kit: show guide + next button
        addMessages(
          [
            { role: "ag", text: `${kit.name} Kit이 활성화됐어요 ${emoji}` },
            ...(kit.guide ? [{ role: "ag" as ChatRole, text: kit.guide }] : []),
          ],
          "kit-intro"
        );
      }
    },
    [kits, addMessages, getKitFlow]
  );

  /** Advance to next question within current kit, or move to next kit */
  const advanceKitQuestion = useCallback(
    (currentKitIdx: number, currentQIdx: number) => {
      const kit = kits[currentKitIdx];
      const flow = getKitFlow(kit);
      if (!flow) return;

      const nextQ = currentQIdx + 1;
      if (nextQ < flow.questions.length) {
        setKitQuestionIndex(nextQ);
        addMessages(
          [{ role: "ag", text: flow.questions[nextQ].message }],
          "kit-q"
        );
      } else {
        // This kit is done, move to next
        setTimeout(() => startKitQuestions(currentKitIdx + 1), 300);
      }
    },
    [kits, getKitFlow, addMessages, startKitQuestions]
  );

  /** Save an answer for a kit question */
  const saveKitAnswer = useCallback(
    (kitKey: string, field: string, value: string) => {
      setKitPreferences((prev) => ({
        ...prev,
        [kitKey]: { ...prev[kitKey], [field]: value },
      }));
    },
    []
  );

  /* ─── Move from MBTI/birth to kits ─── */

  const proceedToKits = useCallback(() => {
    if (kits.length > 0) {
      startKitQuestions(0);
    } else {
      addMessages(
        [{ role: "ag", text: "준비됐어요! 🚀 궁금한 게 있으면 언제든지 말해주세요." }],
        "done"
      );
    }
  }, [kits, addMessages, startKitQuestions]);

  /* ─── Handlers ─── */

  const goToMbti = useCallback(() => {
    addMessages([{ role: "ag", text: "MBTI를 알고 계신가요?" }], "ask-mbti");
  }, [addMessages]);

  const handleBirthSubmit = useCallback(() => {
    if (birthDate) {
      addUserMsg(birthDate);
    } else {
      addUserMsg("건너뛰기");
    }
    setShowInput(false);
    setTimeout(() => goToMbti(), 300);
  }, [birthDate, addUserMsg, goToMbti]);

  const handleBirthSkip = useCallback(() => {
    addUserMsg("건너뛰기");
    setBirthDate("");
    setShowInput(false);
    setTimeout(() => goToMbti(), 300);
  }, [addUserMsg, goToMbti]);

  // MBTI: "알아요" → text input
  const handleMbtiKnow = useCallback(() => {
    addUserMsg("알아요");
    setShowInput(false);
    setTimeout(() => {
      addMessages([{ role: "ag", text: "어떤 타입이세요?" }], "mbti-input");
    }, 300);
  }, [addUserMsg, addMessages]);

  // MBTI: "잘 모르겠어요" → skip
  const handleMbtiSkip = useCallback(() => {
    addUserMsg("잘 모르겠어요");
    setShowInput(false);
    setTimeout(() => {
      addMessages(
        [{ role: "ag", text: "괜찮아요, 나중에 알게 되면 알려주세요 😊" }],
        undefined
      );
      setTimeout(() => proceedToKits(), 600);
    }, 300);
  }, [addUserMsg, addMessages, proceedToKits]);

  // MBTI: submit typed value
  const handleMbtiSubmit = useCallback(() => {
    const val = mbti.trim().toUpperCase();
    if (val.length !== 4) return;
    addUserMsg(val);
    setMbti(val);
    setShowInput(false);
    setTimeout(() => {
      addMessages(
        [{ role: "ag", text: `좋아요! ${val}군요 😊` }],
        undefined
      );
      setTimeout(() => proceedToKits(), 600);
    }, 300);
  }, [mbti, addUserMsg, addMessages, proceedToKits]);

  // Kit: generic "다음 →" for unknown kits
  const handleKitNext = useCallback(() => {
    addUserMsg("다음 →");
    setShowInput(false);
    setTimeout(() => startKitQuestions(kitIndex + 1), 300);
  }, [kitIndex, addUserMsg, startKitQuestions]);

  // Kit: choice answer
  const handleKitChoice = useCallback(
    (choice: string) => {
      addUserMsg(choice);
      setShowInput(false);

      const kit = kits[kitIndex];
      const flow = getKitFlow(kit);
      if (!flow) return;

      const q = flow.questions[kitQuestionIndex];
      const stored = q.valueMap?.[choice] ?? choice;
      const kitKey = kit.nameEn?.toLowerCase() ?? kit.id;
      saveKitAnswer(kitKey, q.field, stored);

      setTimeout(() => advanceKitQuestion(kitIndex, kitQuestionIndex), 300);
    },
    [kits, kitIndex, kitQuestionIndex, getKitFlow, addUserMsg, saveKitAnswer, advanceKitQuestion]
  );

  // Kit: text answer
  const handleKitTextSubmit = useCallback(() => {
    const val = textInput.trim();
    if (!val) return;
    addUserMsg(val);
    setTextInput("");
    setShowInput(false);

    const kit = kits[kitIndex];
    const flow = getKitFlow(kit);
    if (!flow) return;

    const q = flow.questions[kitQuestionIndex];
    const kitKey = kit.nameEn?.toLowerCase() ?? kit.id;
    saveKitAnswer(kitKey, q.field, val);

    setTimeout(() => advanceKitQuestion(kitIndex, kitQuestionIndex), 300);
  }, [textInput, kits, kitIndex, kitQuestionIndex, getKitFlow, addUserMsg, saveKitAnswer, advanceKitQuestion]);

  // Kit: skip button for text input
  const handleKitTextSkip = useCallback(() => {
    const kit = kits[kitIndex];
    const flow = getKitFlow(kit);
    if (!flow) return;

    const q = flow.questions[kitQuestionIndex];
    const label = q.skipButton ?? "건너뛰기";
    const val = q.skipValue ?? "";
    addUserMsg(label);
    setShowInput(false);

    const kitKey = kit.nameEn?.toLowerCase() ?? kit.id;
    saveKitAnswer(kitKey, q.field, val);

    setTimeout(() => advanceKitQuestion(kitIndex, kitQuestionIndex), 300);
  }, [kits, kitIndex, kitQuestionIndex, getKitFlow, addUserMsg, saveKitAnswer, advanceKitQuestion]);

  // Done: save everything
  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const update: Record<string, unknown> = { profile: {} };
      if (birthDate) (update.profile as Record<string, string>).birthDate = birthDate;
      const mbtiVal = mbti.trim().toUpperCase();
      if (mbtiVal.length === 4) (update.profile as Record<string, string>).mbti = mbtiVal;
      if (Object.keys(kitPreferences).length > 0) {
        update.kitPreferences = kitPreferences;
      }
      await api.updateSettings(update as any);
    } catch {}
    try {
      await api.updateSettings({ onboardingCompleted: true } as any);
    } catch {}
    setSaving(false);
    onComplete();
  }, [birthDate, mbti, kitPreferences, onComplete]);

  /* ─── Current kit question (if in kit-q phase) ─── */

  const currentKitQuestion: KitQuestion | null =
    phase === "kit-q" && kits[kitIndex]
      ? (() => {
          const flow = getKitFlow(kits[kitIndex]);
          return flow?.questions[kitQuestionIndex] ?? null;
        })()
      : null;

  /* ─── Progress ─── */

  const totalSteps = 3 + kits.length + 1; // birth + mbti + kits + done
  let currentStep = 1;
  if (phase === "ask-birth") currentStep = 1;
  else if (phase === "ask-mbti" || phase === "mbti-input") currentStep = 2;
  else if (phase === "kit-intro" || phase === "kit-q") currentStep = 3 + kitIndex;
  else if (phase === "done") currentStep = totalSteps;
  const progressPct = Math.min(100, Math.round((currentStep / totalSteps) * 100));

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
        <div
          className="flex-none px-4 pt-4 border-t border-border bg-background space-y-2 animate-in fade-in duration-200"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
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

          {/* MBTI: ask if they know */}
          {phase === "ask-mbti" && (
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={handleMbtiKnow}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                알아요
              </button>
              <button
                onClick={handleMbtiSkip}
                className="px-5 py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                잘 모르겠어요
              </button>
            </div>
          )}

          {/* MBTI: text input */}
          {phase === "mbti-input" && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={mbti}
                onChange={(e) => setMbti(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="예: INFJ"
                maxLength={4}
                className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow uppercase tracking-widest text-center font-bold"
                autoFocus
              />
              <button
                onClick={handleMbtiSubmit}
                disabled={mbti.trim().length !== 4}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                확인
              </button>
            </div>
          )}

          {/* Kit: custom question with choices */}
          {phase === "kit-q" && currentKitQuestion?.type === "choice" && (
            <div className="flex flex-wrap items-center gap-2 justify-center">
              {currentKitQuestion.choices!.map((c) => (
                <button
                  key={c}
                  onClick={() => handleKitChoice(c)}
                  className="px-4 py-2.5 text-sm rounded-xl border border-border hover:bg-foreground hover:text-background transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Kit: custom question with text input */}
          {phase === "kit-q" && currentKitQuestion?.type === "text" && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="입력해주세요..."
                className="flex-1 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && textInput.trim()) handleKitTextSubmit();
                }}
              />
              {currentKitQuestion.skipButton && (
                <button
                  onClick={handleKitTextSkip}
                  className="px-4 py-2.5 text-sm rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  {currentKitQuestion.skipButton}
                </button>
              )}
              <button
                onClick={handleKitTextSubmit}
                disabled={!textInput.trim()}
                className="px-4 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-30 transition-opacity"
              >
                확인
              </button>
            </div>
          )}

          {/* Kit: unknown kit with guide, simple next */}
          {phase === "kit-intro" && (
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
