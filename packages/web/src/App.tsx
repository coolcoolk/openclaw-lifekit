import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/layouts/Sidebar";
import { BottomTabBar } from "@/layouts/BottomTabBar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CalendarPage } from "@/pages/CalendarPage";
import { BalancePage } from "@/pages/BalancePage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LanguageProvider } from "@/contexts/LanguageContext";

function Layout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  // 현재 경로에서 activePage 추출
  const activePage = location.pathname.slice(1) || "calendar";

  return (
    <div className="flex h-screen">
      {!isMobile && (
        <Sidebar activePage={activePage} onNavigate={(page) => navigate(`/${page}`)} />
      )}
      <main className={`flex-1 overflow-y-auto ${isMobile ? "pb-[72px]" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/balance" element={<BalancePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </main>
      {isMobile && (
        <BottomTabBar activePage={activePage} onNavigate={(page) => navigate(`/${page}`)} />
      )}
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
