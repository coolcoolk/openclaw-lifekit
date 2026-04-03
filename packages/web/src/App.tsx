import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/layouts/Sidebar";
import { BottomTabBar } from "@/layouts/BottomTabBar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CalendarPage } from "@/pages/CalendarPage";
import { BalancePage } from "@/pages/BalancePage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OnboardingModal } from "@/components/OnboardingModal";
import { api } from "@/lib/api";

function Layout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // iOS PWA: 실제 뷰포트 높이를 CSS 변수로 설정
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', () => setTimeout(setVh, 100));
    return () => {
      window.removeEventListener('resize', setVh);
    };
  }, []);

  useEffect(() => {
    api.getSettings()
      .then((settings) => {
        if (!(settings as any).onboardingCompleted) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingProfile(false));
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate("/calendar");
  };

  // 현재 경로에서 activePage 추출
  const activePage = location.pathname.slice(1) || "calendar";

  if (checkingProfile) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100dvh' }}>
        <div className="animate-pulse text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'var(--app-height, 100dvh)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      <div className="flex flex-1 min-h-0">
      {!isMobile && (
        <Sidebar activePage={activePage} onNavigate={(page) => navigate(`/${page}`)} />
      )}
      <main className={`flex-1 overflow-y-auto ${isMobile ? "pb-[72px]" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/balance" element={<BalancePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/reports" element={<Navigate to="/projects" replace />} />
          <Route path="/balance/projects" element={<Navigate to="/projects" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </main>
      </div>
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
