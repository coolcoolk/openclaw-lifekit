import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function InvestmentDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getInvestmentAssets(),
      api.getInvestmentSummary(),
    ])
      .then(([a, s]) => { setAssets(a); setSummary(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  if (assets.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">📈 아직 기록이 없어요</p>
        <p className="text-xs text-muted-foreground mt-1">보유 자산을 등록해보세요!</p>
      </div>
    );
  }

  const totalValue = summary.reduce((s, r) => s + (r.total_value ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* 총 평가액 */}
      <div className="border border-border rounded-lg p-4 text-center">
        <div className="text-[10px] text-muted-foreground mb-1">총 평가액</div>
        <div className="text-2xl font-bold">{totalValue.toLocaleString()}원</div>
      </div>

      {/* 자산 유형별 요약 */}
      {summary.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">자산 유형별</h4>
          <div className="grid grid-cols-2 gap-2">
            {summary.map((s: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-3 text-center">
                <div className="text-xs font-medium">{s.asset_type}</div>
                <div className="text-sm font-bold mt-1">{(s.total_value ?? 0).toLocaleString()}원</div>
                <div className="text-[10px] text-muted-foreground">{s.count}종목</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 보유 자산 목록 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">보유 자산</h4>
        <div className="space-y-1.5">
          {assets.map((asset) => {
            const qty = asset.quantity ?? 0;
            const price = asset.currentPrice || asset.current_price || asset.avgPrice || asset.avg_price || 0;
            const value = qty * price;
            return (
              <div key={asset.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs font-medium">{asset.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {asset.assetType || asset.asset_type} · {qty}{asset.unit || "주"}
                  </div>
                </div>
                <span className="text-xs font-medium">{value.toLocaleString()}원</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
