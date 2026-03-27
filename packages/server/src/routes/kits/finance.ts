import { Hono } from "hono";
import { db, sqlite } from "../../db";
import { expenses, fixedExpenses } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const financeRoutes = new Hono();

// ── Expenses (가계부) ──

// GET /api/kits/finance/expenses
financeRoutes.get("/expenses", (c) => {
  const date = c.req.query("date");
  const type = c.req.query("type");
  let query = "SELECT * FROM expenses WHERE 1=1";
  const params: string[] = [];
  if (date) { query += " AND date = ?"; params.push(date); }
  if (type) { query += " AND type = ?"; params.push(type); }
  query += " ORDER BY date DESC";

  const rows = sqlite.query<any, string[]>(query).all(...params);
  return c.json(rows);
});

// GET /api/kits/finance/expenses/:id
financeRoutes.get("/expenses/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/finance/expenses
financeRoutes.post("/expenses", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(expenses).values({
    id,
    date: body.date,
    amount: body.amount,
    type: body.type,
    expenseType: body.expense_type || null,
    incomeType: body.income_type || null,
    category: body.category || null,
    domainId: body.domain_id || null,
    paymentMethod: body.payment_method || null,
    memo: body.memo || null,
    fixedExpenseId: body.fixed_expense_id || null,
    createdAt: now,
  }).run();

  const created = db.select().from(expenses).where(eq(expenses.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/finance/expenses/:id
financeRoutes.patch("/expenses/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.type !== undefined) updates.type = body.type;
  if (body.expense_type !== undefined) updates.expenseType = body.expense_type;
  if (body.income_type !== undefined) updates.incomeType = body.income_type;
  if (body.category !== undefined) updates.category = body.category;
  if (body.domain_id !== undefined) updates.domainId = body.domain_id;
  if (body.payment_method !== undefined) updates.paymentMethod = body.payment_method;
  if (body.memo !== undefined) updates.memo = body.memo;
  if (body.fixed_expense_id !== undefined) updates.fixedExpenseId = body.fixed_expense_id;

  db.update(expenses).set(updates).where(eq(expenses.id, id)).run();
  const updated = db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/finance/expenses/:id
financeRoutes.delete("/expenses/:id", (c) => {
  const { id } = c.req.param();
  db.delete(expenses).where(eq(expenses.id, id)).run();
  return c.json({ ok: true });
});

// ── Fixed Expenses (고정비) ──

// GET /api/kits/finance/fixed
financeRoutes.get("/fixed", (c) => {
  const rows = db.select().from(fixedExpenses).all();
  return c.json(rows);
});

// GET /api/kits/finance/fixed/:id
financeRoutes.get("/fixed/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(fixedExpenses).where(eq(fixedExpenses.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/finance/fixed
financeRoutes.post("/fixed", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(fixedExpenses).values({
    id,
    name: body.name,
    amount: body.amount,
    billingDay: body.billing_day,
    category: body.category || null,
    domainId: body.domain_id || null,
    paymentMethod: body.payment_method || null,
    isActive: body.is_active !== undefined ? body.is_active : true,
    createdAt: now,
    updatedAt: now,
  }).run();

  const created = db.select().from(fixedExpenses).where(eq(fixedExpenses.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/finance/fixed/:id
financeRoutes.patch("/fixed/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: Record<string, any> = { updatedAt: now };
  if (body.name !== undefined) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.billing_day !== undefined) updates.billingDay = body.billing_day;
  if (body.category !== undefined) updates.category = body.category;
  if (body.domain_id !== undefined) updates.domainId = body.domain_id;
  if (body.payment_method !== undefined) updates.paymentMethod = body.payment_method;
  if (body.is_active !== undefined) updates.isActive = body.is_active;

  db.update(fixedExpenses).set(updates).where(eq(fixedExpenses.id, id)).run();
  const updated = db.select().from(fixedExpenses).where(eq(fixedExpenses.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/finance/fixed/:id
financeRoutes.delete("/fixed/:id", (c) => {
  const { id } = c.req.param();
  db.delete(fixedExpenses).where(eq(fixedExpenses.id, id)).run();
  return c.json({ ok: true });
});

// GET /api/kits/finance/summary — 월별 요약
financeRoutes.get("/summary", (c) => {
  const month = c.req.query("month"); // YYYY-MM
  if (!month) return c.json({ error: "month query required (YYYY-MM)" }, 400);

  const row = sqlite.query<any, [string, string]>(`
    SELECT
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
      COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count
    FROM expenses
    WHERE date >= ? AND date < ?
  `).get(`${month}-01`, `${month}-32`);

  const byCategory = sqlite.query<any, [string, string]>(`
    SELECT category, expense_type, SUM(amount) as total, COUNT(*) as count
    FROM expenses
    WHERE type = 'expense' AND date >= ? AND date < ?
    GROUP BY category, expense_type
    ORDER BY total DESC
  `).all(`${month}-01`, `${month}-32`);

  return c.json({ month, ...row, byCategory });
});
