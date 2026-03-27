import { useState } from "react";
import { Sidebar } from "@/layouts/Sidebar";
import { BottomTabBar } from "@/layouts/BottomTabBar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CalendarPage } from "@/pages/CalendarPage";
import { BalancePage } from "@/pages/BalancePage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LanguageProvider } from "@/contexts/LanguageContext";

function App() {
  const [activePage, setActivePage] = useState("calendar");
  const isMobile = useIsMobile();

  const renderPage = () => {
    switch (activePage) {
      case "calendar":
        return <CalendarPage />;
      case "reports":
        return <ReportsPage />;
      case "balance":
        return <BalancePage />;
      case "projects":
        return <ProjectsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <CalendarPage />;
    }
  };

  return (
    <LanguageProvider>
      <div className="flex h-screen">
        {!isMobile && (
          <Sidebar activePage={activePage} onNavigate={setActivePage} />
        )}
        <main className={`flex-1 overflow-y-auto ${isMobile ? "pb-[72px]" : ""}`}>
          {renderPage()}
        </main>
        {isMobile && (
          <BottomTabBar activePage={activePage} onNavigate={setActivePage} />
        )}
      </div>
    </LanguageProvider>
  );
}

export default App;
