import { cn } from "@/lib/utils";
import { BarChart3, Calendar, Target, Radar, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomTabBarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function BottomTabBar({ activePage, onNavigate }: BottomTabBarProps) {
  const { t } = useLanguage();

  const tabs = [
    { icon: <Calendar size={22} />, label: t("nav.calendar"), id: "calendar" },
    { icon: <BarChart3 size={22} />, label: t("nav.reports"), id: "reports" },
    { icon: <Target size={22} />, label: t("nav.projects"), id: "projects" },
    { icon: <Radar size={22} />, label: t("nav.balance"), id: "balance" },
    { icon: <Settings size={22} />, label: t("nav.settings"), id: "settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.id === activePage;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
