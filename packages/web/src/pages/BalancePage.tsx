import { useEffect, useRef, useState } from "react";
import {
  api,
  type Domain,
  type Area,
  type SatisfactionRecord,
  type BalanceData,
  type Relation,
  type AreaXp,
} from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { RelationsKit } from "@/components/RelationsKit";
import { X, Send, Plus, Pencil, Trash2, Users } from "lucide-react";

// 만족도 레벨 라벨
function satisfactionLabel(score: number | null): string {
  if (score === null) return "파악 중";
  if (score >= 8) return "만족";
  if (score >= 5) return "보통";
  if (score >= 3) return "주의";
  return "위험";
}

function satisfactionColor(score: number | null): string {
  if (score === null) return "#a3a3a3";
  if (score >= 8) return "#22c55e";
  if (score >= 5) return "#3b82f6";
  if (score >= 3) return "#f59e0b";
  return "#ef4444";
}

// ── 밸런스 레이더 차트 ──
function BalanceRadarChart({
  balance,
  domains,
}: {
  balance: BalanceData[];
  domains: Domain[];
}) {
  // 모든 도메인을 표시 (데이터 없는 도메인도 0으로)
  const data = domains.map((d) => {
    const found = balance.find((b) => b.domainId === d.id);
    return {
      domain: d.name,
      domainId: d.id,
      count: found?.count ?? 0,
      fullMark: Math.max(...balance.map((b) => b.count), 1),
    };
  });

  return (
    <div className="border border-border rounded-lg p-4 md:p-5 mb-6">
      <h2 className="text-sm font-semibold mb-3">이번 주 활동 밸런스</h2>
      {balance.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          최근 7일 동안 완료된 태스크가 없습니다
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#e5e5e5" />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <PolarRadiusAxis
              angle={90}
              tick={{ fontSize: 10, fill: "#a3a3a3" }}
              axisLine={false}
            />
            <Radar
              name="완료 태스크"
              dataKey="count"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const color = DOMAIN_COLORS[payload.domainId] || DOMAIN_COLORS["default"];
                return (
                  <circle
                    key={payload.domainId}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                );
              }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e5e5",
              }}
              formatter={(value: number) => [`${value}건`, "완료 태스크"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── 영역 카드 ──
function AreaRow({
  area,
  domainColor,
  isUnknown,
  onSetup,
  xpData,
}: {
  area: Area;
  domainColor: string;
  isUnknown: boolean;
  onSetup?: () => void;
  xpData?: AreaXp;
}) {
  const pct = (area.satisfaction || 0) * 10;
  const barColor = isUnknown ? "#d4d4d4" : domainColor;

  // XP progress: xp within current level (each level = 100 XP)
  const xp = xpData?.xp ?? 0;
  const level = xpData?.level ?? 1;
  const xpInLevel = xp % 100;
  const xpForNext = 100;

  return (
    <div className={`${isUnknown ? "opacity-50 hover:opacity-80 transition-opacity" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm w-5 text-center">{area.icon}</span>
        <span className="text-sm flex-1 truncate">{area.name}</span>
        {isUnknown && onSetup ? (
          <button
            onClick={onSetup}
            className="text-xs px-2 py-0.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors shrink-0"
          >
            + 시작하기
          </button>
        ) : (
          <>
            <div className="w-20 md:w-28 h-2 bg-muted rounded-full overflow-hidden shrink-0">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <span
              className="text-xs w-10 text-right font-medium"
              style={{ color: satisfactionColor(area.satisfaction) }}
            >
              {area.satisfaction ?? "—"}/10
            </span>
          </>
        )}
      </div>
      {/* XP progress bar */}
      {!isUnknown && (
        <div className="flex items-center gap-1.5 ml-7 mt-1">
          <span className="text-[10px] font-semibold text-purple-600 shrink-0">
            Lv.{level}
          </span>
          <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden max-w-24">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(xpInLevel / xpForNext) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {xpInLevel}/{xpForNext}
          </span>
        </div>
      )}
    </div>
  );
}

// ── 추이 차트 ──
function TrendChart({
  history,
  areas,
  domainColor,
}: {
  history: SatisfactionRecord[];
  areas: Area[];
  domainColor: string;
}) {
  if (history.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
        아직 기록된 이력이 없습니다
      </div>
    );
  }

  // 날짜별로 그룹핑 → area별 점수 매핑
  const dateMap = new Map<string, Record<string, number>>();
  for (const record of history) {
    const date = record.recordedAt.slice(0, 10);
    if (!dateMap.has(date)) dateMap.set(date, {});
    dateMap.get(date)![record.areaId] = record.score;
  }

  const dates = [...dateMap.keys()].sort();
  const chartData = dates.map((date) => ({
    date,
    ...dateMap.get(date),
  }));

  // 차트에 표시할 area 색상 (도메인 색상 기반 톤 변화)
  const areaIds = [...new Set(history.map((h) => h.areaId))];

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={24} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e5e5e5",
          }}
          labelFormatter={(v: string) => v}
          formatter={(value: number, name: string) => {
            const area = areas.find((a) => a.id === name);
            return [value, area?.name ?? name];
          }}
        />
        {areaIds.map((areaId, i) => (
          <Line
            key={areaId}
            type="monotone"
            dataKey={areaId}
            stroke={domainColor}
            strokeWidth={2}
            dot={{ r: 3 }}
            strokeOpacity={1 - i * 0.2}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── 온보딩 첫 메시지 매핑 ──
const ONBOARDING_FIRST_MESSAGES: Record<string, string> = {
  "health-exercise": "안녕하세요! 운동/신체 온보딩을 시작할게요 🏃\n\n이 영역에서 제가 해드릴 것들:\n- 운동 기록 (세트/중량/횟수)\n- 목표 추적 및 진행상황 체크\n- 주간 회고에 운동 현황 자동 포함\n\n지금 하고 있는 운동이 있어요? (복수 선택)\n1. 헬스/웨이트\n2. 러닝\n3. 사이클\n4. 수영\n5. 구기종목\n6. 기타\n7. 없음",
  "health-mental": "정신/마음 온보딩을 시작할게요 🧠\n\n이 영역에서 제가 해드릴 것들:\n- 주기적 컨디션 체크인\n- 수면·스트레스·삶의 의미 집중 관리\n\n최근 2주 기준, 해당하는 번호 골라주세요!\n\n1. 자다가 자주 깨거나 잠들기 어렵다\n2. 아침에 일어나도 개운하지 않다\n3. 이유 없이 피곤하고 기운이 없다\n4. 하던 것들이 예전만큼 재미없다\n5. 아무것도 하기 싫은 날이 잦다",
  "health-diet": "식습관 온보딩을 시작할게요 🥗\n\n현재 식습관 관리 레벨이 어느 정도예요?\n\n1. 그냥 먹고 싶은 거 먹음\n2. 대충 신경은 쓰는 편\n3. 단백질/칼로리 어느 정도 챙김\n4. 식단 꽤 체계적으로 관리 중\n5. 철저하게 관리 중",
  "work-job": "직장 온보딩을 시작할게요 💼\n\n현재 일 상황이 어떻게 돼요?\n\n1. 직장인\n2. 사업가\n3. 프리랜서\n4. 학생\n5. 구직 중\n6. 쉬는 중",
  "work-business": "사업 온보딩을 시작할게요 🏢\n\n현재 사업 단계는 어디인가요?\n\n1. 아이디어 단계\n2. 준비 중\n3. 초기 운영 (1년 미만)\n4. 운영 중 (1년 이상)\n5. 확장/스케일업",
  "work-side": "부업 온보딩을 시작할게요 💡\n\n어떤 유형의 부업을 하고 있거나 관심 있나요?\n\n1. 프리랜서\n2. 콘텐츠 크리에이터\n3. 투자 (주식/코인 등)\n4. 온라인 판매\n5. 기타",
  "finance-spending": "소비/저축 온보딩을 시작할게요 💰\n\n현금흐름 관리 레벨이 어느 정도예요?\n\n1. 그냥 쓰는 대로 씀\n2. 대충 빠듯한지 정도만 앎\n3. 가계부/앱으로 기록 중\n4. 계좌 분리해서 체계적으로 관리 중\n5. 예산 짜고 목표대로 관리 중",
  "finance-invest": "투자 온보딩을 시작할게요 📈\n\n주로 투자하는(관심 있는) 자산은 무엇인가요?\n\n1. 주식\n2. 부동산\n3. 코인/가상자산\n4. 펀드/ETF\n5. 아직 투자 안 함",
  "rel-lover": "연인 관계 온보딩을 시작할게요 💕\n\n현재 연애 상태는 어떤가요?\n\n1. 솔로\n2. 썸/시작 단계\n3. 연애 중\n4. 동거 중\n5. 결혼/약혼",
  "rel-friends": "친구 관계 온보딩을 시작할게요 🤝\n\n가까운 친구가 몇 명 정도 있나요?\n\n1. 거의 없음\n2. 1~2명\n3. 3~5명\n4. 5명 이상",
  "rel-family": "가족 관계 온보딩을 시작할게요 👨‍👩‍👧‍👦\n\n가족과 얼마나 자주 연락하나요?\n\n1. 거의 안 함\n2. 월 1~2회\n3. 주 1회\n4. 주 2회 이상\n5. 같이 살고 있음",
  "rel-pet": "반려동물 온보딩을 시작할게요 🐾\n\n현재 반려동물이 있나요?\n\n1. 있음\n2. 없지만 계획 중\n3. 없음",
  "growth-self": "자기계발 온보딩을 시작할게요 📚\n\n현재 하고 있는 자기계발이 있나요?\n\n1. 독서\n2. 온라인 강의\n3. 자격증 준비\n4. 외국어 공부\n5. 안 하고 있음",
  "growth-culture": "문화생활 온보딩을 시작할게요 🎭\n\n주로 즐기는 문화생활은 무엇인가요?\n\n1. 영화/드라마\n2. 공연/뮤지컬\n3. 전시/미술관\n4. 음악/콘서트\n5. 기타/안 즐김",
  "growth-hobby": "취미활동 온보딩을 시작할게요 🎯\n\n현재 즐기는 취미가 있나요?\n\n자유롭게 입력해주세요! (예: 게임, 그림, 악기 연주 등)",
  "growth-travel": "여행 온보딩을 시작할게요 ✈️\n\n여행을 얼마나 자주 가나요?\n\n1. 거의 안 감\n2. 연 1~2회\n3. 분기 1회\n4. 월 1회 이상",
  "appear-fashion": "패션 온보딩을 시작할게요 👔\n\n패션에 대한 관심도는 어느 정도인가요?\n\n1. 관심 없음\n2. 최소한만\n3. 보통\n4. 꽤 신경 씀\n5. 매우 중요",
  "appear-skincare": "스킨케어/위생 온보딩을 시작할게요 🧴\n\n현재 스킨케어 루틴이 어떤가요?\n\n1. 없음 (세안만)\n2. 기초 (세안+로션)\n3. 중급 (세럼/자외선차단 포함)\n4. 풀 루틴 관리 중",
  "living-housework": "가사 온보딩을 시작할게요 🏠\n\n현재 동거 형태는 어떤가요?\n\n1. 혼자 살고 있음\n2. 가족과 함께\n3. 룸메이트/동거인\n4. 기숙사",
  "living-admin": "생활관리 온보딩을 시작할게요 📋\n\n현재 잘 관리되고 있는 것은 무엇인가요? (복수 선택 가능)\n\n1. 공과금/세금\n2. 보험/연금\n3. 구독 서비스\n4. 서류/우편물\n5. 전부 다 잘 관리됨",
};

const DEFAULT_ONBOARDING_MESSAGE = "온보딩을 시작할게요!\n\n이 영역에서 현재 상태가 어떤가요?\n\n1. 아직 시작 안 함\n2. 가끔 신경 씀\n3. 어느 정도 관리 중\n4. 체계적으로 관리 중\n5. 매우 잘 하고 있음";

function getOnboardingFirstMessage(areaId: string): string {
  return ONBOARDING_FIRST_MESSAGES[areaId] ?? DEFAULT_ONBOARDING_MESSAGE;
}

// ── 온보딩 채팅 드로어 ──
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function OnboardingDrawer({
  area,
  onClose,
  onComplete,
}: {
  area: Area;
  onClose: () => void;
  onComplete: (areaId: string, data: Record<string, any>) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: getOnboardingFirstMessage(area.id) },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    try {
      const res = await api.onboardingChat({
        areaId: area.id,
        message: text,
        history: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: ChatMessage = { role: "assistant", content: res.message };
      setMessages((prev) => [...prev, assistantMsg]);

      if (res.isComplete) {
        setTimeout(() => {
          onComplete(area.id, res.data);
        }, 1500);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "죄송해요, 오류가 발생했어요. 다시 시도해주세요." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 사이드 패널 – 모바일: 전체화면, 데스크톱: 우측 슬라이드 */}
      <div className="fixed inset-0 md:left-auto md:w-full md:max-w-md bg-background md:border-l md:border-border z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <h2 className="font-semibold text-sm">
            {area.icon} {area.name} 온보딩
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm text-sm text-muted-foreground">
                ...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 – 하단 고정, 모바일 safe area 대응 */}
        <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 도메인 카드 ──
function DomainCard({
  domain,
  areas,
  history,
  onAreaSetup,
  onDomainClick,
  xpMap,
}: {
  domain: Domain;
  areas: Area[];
  history: SatisfactionRecord[];
  onAreaSetup: (area: Area) => void;
  onDomainClick?: (domain: Domain) => void;
  xpMap: Record<string, AreaXp>;
}) {
  const domainAreas = areas.filter((a) => a.domainId === domain.id);
  const domainHistory = history.filter((h) =>
    domainAreas.some((a) => a.id === h.areaId),
  );

  // 도메인 평균 만족도
  const scoredAreas = domainAreas.filter((a) => a.satisfaction !== null);
  const avgScore =
    scoredAreas.length > 0
      ? Math.round(
          (scoredAreas.reduce((sum, a) => sum + (a.satisfaction ?? 0), 0) /
            scoredAreas.length) *
            10,
        ) / 10
      : null;

  return (
    <div
      className={`border border-border rounded-lg p-4 md:p-5 hover:shadow-sm transition-shadow ${onDomainClick ? "cursor-pointer" : ""}`}
      onClick={() => onDomainClick?.(domain)}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{domain.icon}</span>
          <h3 className="font-semibold">{domain.name}</h3>
        </div>
        {avgScore !== null && (
          <span
            className="text-sm font-medium px-2 py-0.5 rounded-full"
            style={{
              color: satisfactionColor(avgScore),
              backgroundColor: satisfactionColor(avgScore) + "18",
            }}
          >
            평균 {avgScore}
          </span>
        )}
      </div>

      {/* 영역 리스트 */}
      <div className="space-y-2.5 mb-4">
        {domainAreas.map((area) => (
          <AreaRow
            key={area.id}
            area={area}
            domainColor={domain.color}
            isUnknown={area.satisfaction === null}
            onSetup={area.satisfaction === null ? () => onAreaSetup(area) : undefined}
            xpData={xpMap[area.id]}
          />
        ))}
      </div>

      {/* 추이 차트 */}
      <TrendChart
        history={domainHistory}
        areas={domainAreas}
        domainColor={domain.color}
      />
    </div>
  );
}

// ── 관계 유형 상수 ──
const RELATION_TYPES = [
  { value: "lover", label: "연인", color: "#ec4899", bg: "bg-pink-100 text-pink-700" },
  { value: "friend", label: "친구", color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  { value: "family", label: "가족", color: "#22c55e", bg: "bg-green-100 text-green-700" },
  { value: "business", label: "비즈니스", color: "#f59e0b", bg: "bg-yellow-100 text-yellow-700" },
] as const;

function relationTypeBadge(type: string | null) {
  const found = RELATION_TYPES.find((t) => t.value === type);
  if (!found) return { label: "기타", bg: "bg-gray-100 text-gray-600" };
  return found;
}

// ── 관계 편집 모달 ──
function RelationModal({
  relation,
  onClose,
  onSave,
}: {
  relation: Partial<Relation> | null; // null = 새로 만들기
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const isNew = !relation?.id;
  const [name, setName] = useState(relation?.name ?? "");
  const [nickname, setNickname] = useState(relation?.nickname ?? "");
  const [relationType, setRelationType] = useState(relation?.relationType ?? "");
  const [birthday, setBirthday] = useState(relation?.birthday ?? "");
  const [memo, setMemo] = useState(relation?.memo ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      nickname: nickname.trim() || null,
      relation_type: relationType || null,
      birthday: birthday || null,
      memo: memo.trim() || null,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-5 h-14 border-b border-border">
            <h2 className="font-semibold text-sm">
              {isNew ? "관계 추가" : "관계 수정"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">이름 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="별명"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">관계 유형</label>
              <div className="flex flex-wrap gap-2">
                {RELATION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setRelationType(relationType === t.value ? "" : t.value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      relationType === t.value
                        ? t.bg + " border-transparent font-medium"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">생일</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">메모</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="메모"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isNew ? "추가" : "저장"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── 관계 섹션 ──
function RelationsSection({
  relations,
  onAdd,
  onEdit,
  onDelete,
}: {
  relations: Relation[];
  onAdd: () => void;
  onEdit: (relation: Relation) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? relations
    : relations.filter((r) => r.relationType === filter);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-pink-500" />
          <h2 className="text-lg font-bold">관계</h2>
          <span className="text-xs text-muted-foreground">
            {relations.length}명
          </span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          추가
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            filter === "all"
              ? "bg-foreground text-background border-transparent font-medium"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          전체 ({relations.length})
        </button>
        {RELATION_TYPES.map((t) => {
          const count = relations.filter((r) => r.relationType === t.value).length;
          return (
            <button
              key={t.value}
              onClick={() => setFilter(filter === t.value ? "all" : t.value)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === t.value
                  ? t.bg + " border-transparent font-medium"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">
            {relations.length === 0
              ? "아직 등록된 관계가 없습니다. 소중한 사람들을 추가해보세요."
              : "해당 유형의 관계가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const badge = relationTypeBadge(r.relationType);
            return (
              <div
                key={r.id}
                className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{r.name}</span>
                      {r.nickname && (
                        <span className="text-xs text-muted-foreground truncate">
                          ({r.nickname})
                        </span>
                      )}
                    </div>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full font-medium ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => onEdit(r)}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {r.birthday && (
                  <div className="text-xs text-muted-foreground mb-1">
                    🎂 {r.birthday}
                  </div>
                )}
                {r.memo && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {r.memo}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──
export function BalancePage() {
  const { t } = useLanguage();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [history, setHistory] = useState<SatisfactionRecord[]>([]);
  const [balance, setBalance] = useState<BalanceData[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [xpMap, setXpMap] = useState<Record<string, AreaXp>>({});
  const [loading, setLoading] = useState(true);
  const [onboardingArea, setOnboardingArea] = useState<Area | null>(null);
  const [relationModal, setRelationModal] = useState<{ open: boolean; relation: Relation | null }>({ open: false, relation: null });
  const [showRelationsKit, setShowRelationsKit] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getDomains(),
      api.getAreas(),
      api.getAllSatisfactionHistory(),
      api.getBalance(7),
      api.getRelations(),
      api.getAllAreaXp(),
    ])
      .then(([d, a, h, b, r, xpList]) => {
        setDomains(d);
        setAreas(a);
        setHistory(h);
        setBalance(b);
        setRelations(r);
        const map: Record<string, AreaXp> = {};
        for (const xp of xpList) map[xp.areaId] = xp;
        setXpMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOnboardingComplete = (areaId: string, data: Record<string, any>) => {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId ? { ...a, satisfaction: data.satisfaction ?? 5 } : a,
      ),
    );
    setOnboardingArea(null);
  };

  const handleRelationSave = async (data: Record<string, any>) => {
    if (relationModal.relation?.id) {
      const updated = await api.updateRelation(relationModal.relation.id, data);
      setRelations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const created = await api.createRelation(data);
      setRelations((prev) => [...prev, created]);
    }
    setRelationModal({ open: false, relation: null });
  };

  const handleRelationDelete = async (id: string) => {
    await api.deleteRelation(id);
    setRelations((prev) => prev.filter((r) => r.id !== id));
  };

  // 전체 통계
  const scoredAreas = areas.filter((a) => a.satisfaction !== null);
  const unknownCount = areas.filter((a) => a.satisfaction === null).length;
  const overallAvg =
    scoredAreas.length > 0
      ? Math.round(
          (scoredAreas.reduce((sum, a) => sum + (a.satisfaction ?? 0), 0) /
            scoredAreas.length) *
            10,
        ) / 10
      : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-3 md:py-8 md:px-4">
        <h1 className="text-xl md:text-2xl font-bold mb-6">🔮 {t("balance.title")}</h1>
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 md:py-8 md:px-4">
      <h1 className="text-xl md:text-2xl font-bold mb-2">🔮 {t("balance.title")}</h1>

      {/* 전체 요약 */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 text-xs md:text-sm text-muted-foreground flex-wrap">
        {overallAvg !== null && (
          <span>
            {t("balance.overallAvg")}:{" "}
            <strong style={{ color: satisfactionColor(overallAvg) }}>
              {overallAvg}/10
            </strong>
          </span>
        )}
        <span>{t("balance.totalAreas", { count: areas.length })}</span>
        {unknownCount > 0 && (
          <span className="text-muted-foreground">
            ({t("balance.identifying", { count: unknownCount })})
          </span>
        )}
      </div>

      {/* 레이더 차트 */}
      <BalanceRadarChart balance={balance} domains={domains} />

      {/* 도메인별 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {domains.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            areas={areas}
            history={history}
            onAreaSetup={setOnboardingArea}
            onDomainClick={domain.id === "relationship" ? () => setShowRelationsKit(true) : undefined}
            xpMap={xpMap}
          />
        ))}
      </div>

      {areas.length === 0 && (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground mt-4">
          <p className="text-sm">
            {t("balance.noAreas")}
          </p>
        </div>
      )}

      {/* 관계 섹션 */}
      <RelationsSection
        relations={relations}
        onAdd={() => setRelationModal({ open: true, relation: null })}
        onEdit={(r) => setRelationModal({ open: true, relation: r })}
        onDelete={handleRelationDelete}
      />

      {/* 관계 추가/수정 모달 */}
      {relationModal.open && (
        <RelationModal
          relation={relationModal.relation}
          onClose={() => setRelationModal({ open: false, relation: null })}
          onSave={handleRelationSave}
        />
      )}

      {/* 온보딩 채팅 드로어 */}
      {onboardingArea && (
        <OnboardingDrawer
          area={onboardingArea}
          onClose={() => setOnboardingArea(null)}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Relations Kit 패널 */}
      {showRelationsKit && (
        <RelationsKit onClose={() => setShowRelationsKit(false)} />
      )}
    </div>
  );
}
