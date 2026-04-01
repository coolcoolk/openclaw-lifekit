import { DietDashboard } from "./DietDashboard";
import { ExerciseDashboard } from "./ExerciseDashboard";
import { FinanceDashboard } from "./FinanceDashboard";
import { InvestmentDashboard } from "./InvestmentDashboard";
import { LearningDashboard } from "./LearningDashboard";
import { CultureDashboard } from "./CultureDashboard";
import { FashionDashboard } from "./FashionDashboard";
import { HobbyDashboard } from "./HobbyDashboard";
import { RelationsDashboard } from "./RelationsDashboard";

// Kit nameEn → dashboard component mapping
const KIT_DASHBOARDS: Record<string, React.ComponentType> = {
  diet: DietDashboard,
  exercise: ExerciseDashboard,
  finance: FinanceDashboard,
  investment: InvestmentDashboard,
  learning: LearningDashboard,
  culture: CultureDashboard,
  fashion: FashionDashboard,
  hobby: HobbyDashboard,
  relations: RelationsDashboard,
};

export function getKitDashboard(kitId: string): React.ComponentType | null {
  // Try exact match by kit id first
  const key = kitId.toLowerCase();
  if (KIT_DASHBOARDS[key]) return KIT_DASHBOARDS[key];

  // Partial match fallback
  for (const [k, v] of Object.entries(KIT_DASHBOARDS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }

  return null;
}

export {
  DietDashboard,
  ExerciseDashboard,
  FinanceDashboard,
  InvestmentDashboard,
  LearningDashboard,
  CultureDashboard,
  FashionDashboard,
  HobbyDashboard,
  RelationsDashboard,
};
