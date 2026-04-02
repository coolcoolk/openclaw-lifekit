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

  // 외부 클릭 시 닫기
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
        <div className="absolute z-50 bg-background border border-border rounded-lg shadow-lg p-2 top-6 left-0">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            styles={{
              root: { fontSize: "13px" },
              caption: { padding: "4px 0" },
              day: { width: "32px", height: "32px" },
            }}
          />
        </div>
      )}
    </div>
  );
}
