export type Language = "ko" | "en";

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  "nav.calendar": { ko: "캘린더", en: "Calendar" },
  "nav.reports": { ko: "리포트", en: "Reports" },
  "nav.projects": { ko: "프로젝트", en: "Projects" },
  "nav.balance": { ko: "밸런스", en: "Balance" },
  "nav.settings": { ko: "설정", en: "Settings" },

  // Common
  "common.save": { ko: "저장", en: "Save" },
  "common.saving": { ko: "저장 중...", en: "Saving..." },
  "common.saved": { ko: "저장 완료", en: "Saved" },
  "common.cancel": { ko: "취소", en: "Cancel" },
  "common.add": { ko: "추가", en: "Add" },
  "common.edit": { ko: "수정", en: "Edit" },
  "common.delete": { ko: "삭제", en: "Delete" },
  "common.close": { ko: "닫기", en: "Close" },
  "common.loading": { ko: "불러오는 중...", en: "Loading..." },
  "common.all": { ko: "전체", en: "All" },
  "common.reset": { ko: "재설정", en: "Reset" },
  "common.none": { ko: "선택 안함", en: "None" },

  // Balance Page
  "balance.title": { ko: "영역 밸런스", en: "Life Balance" },
  "balance.weeklyActivity": { ko: "이번 주 활동 밸런스", en: "Weekly Activity Balance" },
  "balance.noTasksWeek": { ko: "최근 7일 동안 완료된 태스크가 없습니다", en: "No completed tasks in the last 7 days" },
  "balance.completedTasks": { ko: "완료 태스크", en: "Completed" },
  "balance.overallAvg": { ko: "전체 평균", en: "Overall Avg" },
  "balance.totalAreas": { ko: "총 {count}개 영역", en: "{count} areas total" },
  "balance.identifying": { ko: "{count}개 파악 중", en: "{count} identifying" },
  "balance.average": { ko: "평균", en: "Avg" },
  "balance.noAreas": { ko: "아직 등록된 영역이 없습니다. 온보딩을 완료해주세요.", en: "No areas registered yet. Please complete onboarding." },
  "balance.startSetup": { ko: "+ 시작하기", en: "+ Setup" },
  "balance.noHistory": { ko: "아직 기록된 이력이 없습니다", en: "No history recorded yet" },

  // Satisfaction
  "satisfaction.good": { ko: "만족", en: "Good" },
  "satisfaction.normal": { ko: "보통", en: "Normal" },
  "satisfaction.caution": { ko: "주의", en: "Caution" },
  "satisfaction.danger": { ko: "위험", en: "Danger" },
  "satisfaction.identifying": { ko: "파악 중", en: "Identifying" },

  // Relations
  "relations.title": { ko: "관계", en: "Relations" },
  "relations.people": { ko: "명", en: "people" },
  "relations.addRelation": { ko: "관계 추가", en: "Add Relation" },
  "relations.editRelation": { ko: "관계 수정", en: "Edit Relation" },
  "relations.noRelations": { ko: "아직 등록된 관계가 없습니다. 소중한 사람들을 추가해보세요.", en: "No relations yet. Add your important people." },
  "relations.noTypeMatch": { ko: "해당 유형의 관계가 없습니다.", en: "No relations of this type." },
  "relations.name": { ko: "이름", en: "Name" },
  "relations.nickname": { ko: "닉네임", en: "Nickname" },
  "relations.type": { ko: "관계 유형", en: "Relation Type" },
  "relations.birthday": { ko: "생일", en: "Birthday" },
  "relations.memo": { ko: "메모", en: "Memo" },
  "relations.lastMet": { ko: "마지막 만남", en: "Last Met" },
  "relations.meetings": { ko: "만남", en: "Meetings" },
  "relations.times": { ko: "회", en: "times" },
  "relations.lover": { ko: "연인", en: "Lover" },
  "relations.friend": { ko: "친구", en: "Friend" },
  "relations.family": { ko: "가족", en: "Family" },
  "relations.business": { ko: "비즈니스", en: "Business" },
  "relations.other": { ko: "기타", en: "Other" },
  "relations.enterName": { ko: "이름을 입력하세요", en: "Enter name" },
  "relations.enterNickname": { ko: "별명", en: "Nickname" },
  "relations.enterMemo": { ko: "메모", en: "Memo" },
  "relations.stats": { ko: "관계 통계", en: "Relation Stats" },
  "relations.selectPerson": { ko: "관계 인물 선택", en: "Select person" },

  // Tasks
  "tasks.title": { ko: "태스크", en: "Tasks" },
  "tasks.remaining": { ko: "{count}개 남음", en: "{count} remaining" },
  "tasks.completed": { ko: "{count}개 완료", en: "{count} completed" },
  "tasks.addNew": { ko: "새 태스크 추가...", en: "Add new task..." },
  "tasks.done": { ko: "완료됨", en: "Completed" },
  "tasks.empty": { ko: "태스크가 없어요. 위에서 추가해보세요!", en: "No tasks. Add one above!" },

  // Projects
  "projects.title": { ko: "프로젝트", en: "Projects" },
  "projects.active": { ko: "진행 중", en: "Active" },
  "projects.backlog": { ko: "대기", en: "Backlog" },
  "projects.paused": { ko: "일시중단", en: "Paused" },
  "projects.completed": { ko: "완료", en: "Completed" },

  // Calendar
  "calendar.title": { ko: "캘린더", en: "Calendar" },
  "calendar.backlog": { ko: "백로그", en: "Backlog" },
  "calendar.sync": { ko: "동기화", en: "Sync" },
  "calendar.newEvent": { ko: "새 이벤트", en: "New Event" },

  // Reports
  "reports.title": { ko: "리포트", en: "Reports" },
  "reports.daily": { ko: "일일", en: "Daily" },
  "reports.weekly": { ko: "주간", en: "Weekly" },
  "reports.generate": { ko: "리포트 생성", en: "Generate Report" },

  // Settings
  "settings.title": { ko: "설정", en: "Settings" },
  "settings.profile": { ko: "프로필", en: "Profile" },
  "settings.name": { ko: "이름", en: "Name" },
  "settings.namePlace": { ko: "이름을 입력하세요", en: "Enter your name" },
  "settings.birthDate": { ko: "생년월일", en: "Birth Date" },
  "settings.timezone": { ko: "타임존", en: "Timezone" },
  "settings.routineTime": { ko: "루틴 시간", en: "Routine Times" },
  "settings.morningBriefing": { ko: "모닝 브리핑", en: "Morning Briefing" },
  "settings.eveningReview": { ko: "저녁 회고", en: "Evening Review" },
  "settings.aiAdapter": { ko: "AI 어댑터", en: "AI Adapter" },
  "settings.provider": { ko: "프로바이더", en: "Provider" },
  "settings.apiKey": { ko: "API 키", en: "API Key" },
  "settings.localMode": { ko: "로컬 모드 — 키 불필요", en: "Local mode — no key needed" },
  "settings.model": { ko: "모델", en: "Model" },
  "settings.googleCalendar": { ko: "구글 캘린더", en: "Google Calendar" },
  "settings.connectionStatus": { ko: "연동 상태", en: "Connection Status" },
  "settings.connected": { ko: "연동됨", en: "Connected" },
  "settings.disconnected": { ko: "연동 안됨", en: "Disconnected" },
  "settings.syncInterval": { ko: "동기화 주기 (분)", en: "Sync Interval (min)" },
  "settings.notifications": { ko: "알림", en: "Notifications" },
  "settings.briefingNotif": { ko: "모닝 브리핑 알림", en: "Morning Briefing Notification" },
  "settings.reviewNotif": { ko: "저녁 회고 알림", en: "Evening Review Notification" },
  "settings.taskReminder": { ko: "태스크 리마인더", en: "Task Reminder" },
  "settings.dashboard": { ko: "대시보드", en: "Dashboard" },
  "settings.defaultPage": { ko: "기본 페이지", en: "Default Page" },
  "settings.theme": { ko: "테마", en: "Theme" },
  "settings.light": { ko: "라이트", en: "Light" },
  "settings.dark": { ko: "다크", en: "Dark" },
  "settings.system": { ko: "시스템", en: "System" },
  "settings.language": { ko: "언어", en: "Language" },
  "settings.korean": { ko: "한국어", en: "한국어" },
  "settings.english": { ko: "English", en: "English" },
  "settings.areaManagement": { ko: "Area 관리", en: "Area Management" },
  "settings.noAreas": { ko: "등록된 Area가 없습니다.", en: "No areas registered." },
  "settings.resetOnboarding": { ko: "온보딩 재설정", en: "Reset Onboarding" },
  "settings.dataManagement": { ko: "데이터 관리", en: "Data Management" },
  "settings.exportData": { ko: "데이터 내보내기 (JSON)", en: "Export Data (JSON)" },
  "settings.resetAll": { ko: "모든 데이터 초기화", en: "Reset All Data" },
  "settings.resetConfirm": { ko: "모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.", en: "Reset all data? This action cannot be undone." },
  "settings.resetFuture": { ko: "초기화 기능은 추후 구현됩니다.", en: "Reset feature coming soon." },
  "settings.info": { ko: "LifeKit 정보", en: "LifeKit Info" },
  "settings.version": { ko: "버전", en: "Version" },
  "settings.engine": { ko: "엔진", en: "Engine" },
  "settings.confirmResetOnboarding": { ko: '"{name}" 온보딩을 재설정하시겠습니까?', en: 'Reset onboarding for "{name}"?' },
  "settings.resetOnboardingFuture": { ko: "온보딩 재설정 기능은 추후 구현됩니다.", en: "Onboarding reset coming soon." },

  // Onboarding
  "onboarding.title": { ko: "온보딩", en: "Onboarding" },
  "onboarding.inputPlaceholder": { ko: "메시지를 입력하세요...", en: "Type a message..." },
  "onboarding.error": { ko: "죄송해요, 오류가 발생했어요. 다시 시도해주세요.", en: "Sorry, an error occurred. Please try again." },

  // XP
  "xp.level": { ko: "Lv.{level}", en: "Lv.{level}" },
};

export function t(key: string, lang: Language, params?: Record<string, string | number>): string {
  const entry = translations[key];
  let text = entry?.[lang] ?? entry?.["ko"] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
