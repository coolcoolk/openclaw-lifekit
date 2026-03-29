import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function FashionDashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFashionItems()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground py-4 text-center">로딩 중...</div>;

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">👔 아직 기록이 없어요</p>
        <p className="text-xs text-muted-foreground mt-1">옷장 아이템을 등록해보세요!</p>
      </div>
    );
  }

  // 카테고리별
  const byCategory: Record<string, any[]> = {};
  items.forEach((item) => {
    const cat = item.category || "기타";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  return (
    <div className="space-y-4">
      {/* 총 아이템 수 */}
      <div className="border border-border rounded-lg p-4 text-center">
        <div className="text-2xl font-bold">{items.length}</div>
        <div className="text-[10px] text-muted-foreground">옷장 아이템</div>
      </div>

      {/* 카테고리별 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">카테고리별</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat} className="border border-border rounded-lg p-3 text-center">
              <div className="text-sm font-bold">{catItems.length}</div>
              <div className="text-[10px] text-muted-foreground">{cat}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 추가 */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">아이템 목록</h4>
        <div className="space-y-1.5">
          {items.slice(0, 10).map((item) => (
            <div key={item.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
              <div>
                <div className="text-xs font-medium">{item.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {[item.brand, item.color, item.category].filter(Boolean).join(" · ")}
                </div>
              </div>
              {item.price && <span className="text-[10px] text-muted-foreground">{item.price.toLocaleString()}원</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
