import { cn } from "@/lib/utils";
import {
  Calendar,
  FolderKanban,
  Radar,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const { t } = useLanguage();

  const navItems = [
    { icon: <Calendar size={20} />, label: t("nav.calendar"), id: "calendar" },
    { icon: <FolderKanban size={20} />, label: t("nav.projects"), id: "projects" },
    { icon: <Radar size={20} />, label: t("nav.balance"), id: "balance" },
    { icon: <Settings size={20} />, label: t("nav.settings"), id: "settings" },
  ];

  return (
    <aside
      className={cn(
        "h-screen border-r border-border bg-muted/30 flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <img src="/favicon.svg" className="w-6 h-6" alt="LifeKit" />
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight">LifeKit</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 space-y-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
              activePage === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
