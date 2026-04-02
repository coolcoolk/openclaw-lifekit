import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Calendar, X } from "lucide-react";

interface DueDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  onClose?: () => void;
}

export function DueDatePicker({ value, onChange, onClose }: DueDatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  function handleSelect(day?: Date) {
    if (day) {
      const yyyy = day.getFullYear();
      const mm = String(day.getMonth() + 1).padStart(2, "0");
      const dd = String(day.getDate()).padStart(2, "0");
      onChange(`${yyyy}-${mm}-${dd}`);
    }
    setOpen(false);
    onClose?.();
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    onClose?.();
  }

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Calendar size={12} />
        <span>{value ? value.slice(5).replace("-", "/") : "날짜 없음"}</span>
        {value && (
          <span onClick={handleClear} className="ml-1 hover:text-red-500">
            <X size={11} />
          </span>
        )}
      </button>

      {open && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false); onClose?.(); }}
          />
          {/* 달력 팝업 — 화면 중앙 고정 */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background border border-border rounded-xl shadow-xl p-3">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              formatters={{
                formatCaption: (date: Date) =>
                  `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
                formatWeekdayName: (day: Date) => WEEKDAYS[day.getDay()],
              }}
              styles={{
                root: { fontSize: "14px" },
                day: { width: "36px", height: "36px" },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
