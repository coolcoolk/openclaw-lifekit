import { useEffect, useState } from "react";
import {
  api,
  type Domain,
  type Area,
  type BalanceData,
  type AreaXp,
} from "@/lib/api";
import {
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { useLanguage } from "@/contexts/LanguageContext";

// ── 밸런스 레이더 차트 ──
function BalanceRadarChart({
  balance,
  domains,
  t,
}: {
  balance: BalanceData[];
  domains: Domain[];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
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
      <h2 className="text-sm font-semibold mb-3">{t("balance.weeklyActivityBalance")}</h2>
      {balance.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          {t("balance.noTasksWeek")}
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
              name={t("balance.completedTasks")}
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
              formatter={(value: number) => [t("balance.countUnit", { count: value }), t("balance.completedTasks")]}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── 영역 행 (간단) ──
function AreaRow({
  area,
  xpData,
  t,
}: {
  area: Area;
  xpData?: AreaXp;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isUnknown = area.satisfaction === null;
  const xp = xpData?.xp ?? 0;
  const level = xpData?.level ?? 1;
  const xpInLevel = xp % 100;
  const xpForNext = 100;

  return (
    <div className={isUnknown ? "opacity-50" : ""}>
      <div className="flex items-center gap-2">
        <span className="text-sm w-5 text-center">{area.icon}</span>
        <span className="text-sm flex-1 truncate">{area.name}</span>
        {isUnknown && (
          <span className="text-[10px] text-muted-foreground">{t("balance.notStarted")}</span>
        )}
      </div>
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

// ── 도메인 카드 (간단) ──
function DomainCard({
  domain,
  areas,
  xpMap,
  t,
}: {
  domain: Domain;
  areas: Area[];
  xpMap: Record<string, AreaXp>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const domainAreas = areas.filter((a) => a.domainId === domain.id);

  return (
    <div className="border border-border rounded-lg p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{domain.icon}</span>
        <h3 className="font-semibold">{domain.name}</h3>
      </div>
      <div className="space-y-2.5">
        {domainAreas.map((area) => (
          <AreaRow
            key={area.id}
            area={area}
            xpData={xpMap[area.id]}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

// ── 메인 밸런스 페이지 ──
export function BalancePage() {
  const { t } = useLanguage();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [balance, setBalance] = useState<BalanceData[]>([]);
  const [xpMap, setXpMap] = useState<Record<string, AreaXp>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDomains(),
      api.getAreas(),
      api.getBalance(7),
      api.getAllAreaXp(),
    ])
      .then(([d, a, b, xpList]) => {
        setDomains(d);
        setAreas(a);
        setBalance(b);
        const map: Record<string, AreaXp> = {};
        for (const xp of xpList) map[xp.areaId] = xp;
        setXpMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

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

      {/* 요약 */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 text-xs md:text-sm text-muted-foreground">
        <span>{t("balance.totalAreas", { count: areas.length })}</span>
      </div>

      {/* 레이더 차트 */}
      <BalanceRadarChart balance={balance} domains={domains} t={t} />

      {/* 도메인별 영역 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {domains.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            areas={areas}
            xpMap={xpMap}
            t={t}
          />
        ))}
      </div>

      {areas.length === 0 && (
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground mt-4">
          <p className="text-sm">{t("balance.noAreas")}</p>
        </div>
      )}
    </div>
  );
}
