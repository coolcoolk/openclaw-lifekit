import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { X, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface RoutineTaskModalProps {
  projectId?: string | null;
  areaId?: string | null;
  onClose: () => void;
  onCreated?: () => void;
}

const DAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RoutineTaskModal({ projectId, areaId, onClose, onCreated }: RoutineTaskModalProps) {
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const dayLabels = language === "ko" ? DAY_LABELS_KO : DAY_LABELS_EN;
  // Display order: 월화수목금토일 (1,2,3,4,5,6,0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];


  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function selectWeekdays() {
    setSelectedDays([1, 2, 3, 4, 5]);
  }

  function selectAll() {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  }

  async function handleCreate() {
    if (!title.trim() || selectedDays.length === 0) return;
    setSubmitting(true);
    try {
      const routineRule = JSON.stringify({
        freq: "weekly",
        days: selectedDays.sort((a, b) => a - b),
        ...(time ? { time } : {}),
      });

      await api.createTask({
        title: title.trim(),
        project_id: projectId || undefined,
        area_id: areaId || undefined,
        is_routine: true,
        routine_rule: routineRule,
        status: "todo",
        source: "manual",
      } as any);

      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Failed to create routine task:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-purple-500" />
            <h2 className="text-lg font-semibold">
              {language === "ko" ? "루틴 태스크 만들기" : "Create Routine Task"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* 제목 */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              {language === "ko" ? "제목" : "Title"}
            </label>
            <input
              ref={titleRef}
              type="text"
              placeholder={language === "ko" ? "루틴 태스크 제목" : "Routine task title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") onClose();
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* 요일 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground font-medium">
                {language === "ko" ? "반복 요일" : "Repeat Days"}
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {language === "ko" ? "평일" : "Weekdays"}
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {language === "ko" ? "매일" : "Daily"}
                </button>
              </div>
            </div>
            <div className="flex gap-1.5">
              {dayOrder.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md border transition-colors ${
                    selectedDays.includes(day)
                      ? "bg-purple-500 text-white border-purple-500"
                      : "bg-background border-border text-muted-foreground hover:border-purple-300 hover:text-purple-500"
                  }`}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 (선택사항) */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              {language === "ko" ? "시간 (선택사항 — 비우면 종일)" : "Time (optional — leave empty for all-day)"}
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {language === "ko" ? "취소" : "Cancel"}
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || selectedDays.length === 0 || submitting}
            className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {submitting
              ? "..."
              : language === "ko"
              ? "만들기"
              : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
