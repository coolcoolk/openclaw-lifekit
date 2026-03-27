import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { domains, areas } from "./schema";

const sqlite = new Database("data/lifekit.db");
const db = drizzle(sqlite);

// ========== 7 Domains ==========
const DOMAINS = [
  { id: "health", name: "건강", icon: "🏥", color: "#22c55e", sortOrder: 1, isSystem: true },
  { id: "work", name: "일", icon: "💼", color: "#3b82f6", sortOrder: 2, isSystem: true },
  { id: "finance", name: "재무", icon: "💰", color: "#a855f7", sortOrder: 3, isSystem: true },
  { id: "relationship", name: "관계", icon: "💕", color: "#ec4899", sortOrder: 4, isSystem: true },
  { id: "growth", name: "성장/여가", icon: "🌱", color: "#84cc16", sortOrder: 5, isSystem: true },
  { id: "appearance", name: "외모", icon: "👔", color: "#f59e0b", sortOrder: 6, isSystem: true },
  { id: "living", name: "생활", icon: "🏠", color: "#6b7280", sortOrder: 7, isSystem: true },
];

// ========== 18 Areas ==========
const AREAS = [
  // 건강
  { id: "health-exercise", domainId: "health", name: "운동/신체", icon: "💪", sortOrder: 1 },
  { id: "health-mental", domainId: "health", name: "정신/마음", icon: "🧠", sortOrder: 2 },
  { id: "health-diet", domainId: "health", name: "식습관", icon: "🥗", sortOrder: 3 },
  // 일
  { id: "work-job", domainId: "work", name: "직장", icon: "🏢", sortOrder: 1 },
  { id: "work-business", domainId: "work", name: "사업", icon: "🚀", sortOrder: 2 },
  { id: "work-side", domainId: "work", name: "부업", icon: "⚡", sortOrder: 3 },
  // 재무
  { id: "finance-spending", domainId: "finance", name: "소비/저축", icon: "💳", sortOrder: 1 },
  { id: "finance-invest", domainId: "finance", name: "투자", icon: "📈", sortOrder: 2 },
  // 관계
  { id: "rel-lover", domainId: "relationship", name: "연인", icon: "❤️", sortOrder: 1 },
  { id: "rel-friends", domainId: "relationship", name: "친구", icon: "🤝", sortOrder: 2 },
  { id: "rel-family", domainId: "relationship", name: "가족", icon: "👨‍👩‍👧‍👦", sortOrder: 3 },
  { id: "rel-pet", domainId: "relationship", name: "반려동물", icon: "🐱", sortOrder: 4 },
  // 성장/여가
  { id: "growth-self", domainId: "growth", name: "자기계발", icon: "📚", sortOrder: 1 },
  { id: "growth-culture", domainId: "growth", name: "문화생활", icon: "🎭", sortOrder: 2 },
  { id: "growth-hobby", domainId: "growth", name: "취미활동", icon: "🎨", sortOrder: 3 },
  { id: "growth-travel", domainId: "growth", name: "여행", icon: "✈️", sortOrder: 4 },
  // 외모
  { id: "appear-fashion", domainId: "appearance", name: "패션", icon: "👔", sortOrder: 1 },
  { id: "appear-skincare", domainId: "appearance", name: "스킨케어/위생", icon: "🧴", sortOrder: 2 },
  // 생활
  { id: "living-housework", domainId: "living", name: "가사", icon: "🧹", sortOrder: 1 },
  { id: "living-admin", domainId: "living", name: "생활관리", icon: "📋", sortOrder: 2 },
];

async function seed() {
  console.log("🌱 Seeding LifeKit database...");

  // Insert domains
  for (const domain of DOMAINS) {
    db.insert(domains).values(domain).onConflictDoNothing().run();
  }
  console.log(`  ✅ ${DOMAINS.length} domains`);

  // Insert areas
  for (const area of AREAS) {
    db.insert(areas).values(area).onConflictDoNothing().run();
  }
  console.log(`  ✅ ${AREAS.length} areas`);

  console.log("🎉 Seed complete!");
}

seed();
