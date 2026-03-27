import { Hono } from "hono";
import { db, sqlite } from "../../db";
import { investments, investmentTrades } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const investmentRoutes = new Hono();

// ── Investments ──

// GET /api/kits/investment/assets
investmentRoutes.get("/assets", (c) => {
  const assetType = c.req.query("asset_type");
  if (assetType) {
    const rows = db.select().from(investments).where(eq(investments.assetType, assetType)).all();
    return c.json(rows);
  }
  const rows = db.select().from(investments).all();
  return c.json(rows);
});

// GET /api/kits/investment/assets/:id
investmentRoutes.get("/assets/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(investments).where(eq(investments.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/investment/assets
investmentRoutes.post("/assets", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(investments).values({
    id,
    assetType: body.asset_type,
    name: body.name,
    quantity: body.quantity || null,
    unit: body.unit || null,
    avgPrice: body.avg_price || null,
    currentPrice: body.current_price || null,
    currentPriceUpdatedAt: body.current_price ? now : null,
    memo: body.memo || null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(investments).where(eq(investments.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/investment/assets/:id
investmentRoutes.patch("/assets/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.asset_type !== undefined) updates.assetType = body.asset_type;
  if (body.name !== undefined) updates.name = body.name;
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.avg_price !== undefined) updates.avgPrice = body.avg_price;
  if (body.current_price !== undefined) {
    updates.currentPrice = body.current_price;
    updates.currentPriceUpdatedAt = now;
  }
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(investments).set(updates).where(eq(investments.id, id)).run();
  const updated = db.select().from(investments).where(eq(investments.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/investment/assets/:id
investmentRoutes.delete("/assets/:id", (c) => {
  const { id } = c.req.param();
  db.delete(investments).where(eq(investments.id, id)).run();
  return c.json({ ok: true });
});

// ── Trades (매매기록) ──

// GET /api/kits/investment/trades
investmentRoutes.get("/trades", (c) => {
  const investmentId = c.req.query("investment_id");
  if (investmentId) {
    const rows = db.select().from(investmentTrades).where(eq(investmentTrades.investmentId, investmentId)).all();
    return c.json(rows);
  }
  const rows = db.select().from(investmentTrades).all();
  return c.json(rows);
});

// POST /api/kits/investment/trades
investmentRoutes.post("/trades", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(investmentTrades).values({
    id,
    investmentId: body.investment_id,
    tradeType: body.trade_type,
    date: body.date,
    quantity: body.quantity || null,
    price: body.price || null,
    amount: body.amount || null,
    memo: body.memo || null,
    createdAt: now,
  }).run();

  const created = db.select().from(investmentTrades).where(eq(investmentTrades.id, id)).get();
  return c.json(created, 201);
});

// DELETE /api/kits/investment/trades/:id
investmentRoutes.delete("/trades/:id", (c) => {
  const { id } = c.req.param();
  db.delete(investmentTrades).where(eq(investmentTrades.id, id)).run();
  return c.json({ ok: true });
});

// GET /api/kits/investment/summary — 포트폴리오 요약
investmentRoutes.get("/summary", (c) => {
  const rows = sqlite.query<any, []>(`
    SELECT
      asset_type,
      COUNT(*) as count,
      SUM(quantity * COALESCE(current_price, avg_price, 0)) as total_value
    FROM investments
    GROUP BY asset_type
    ORDER BY total_value DESC
  `).all();
  return c.json(rows);
});
