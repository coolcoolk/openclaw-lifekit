import { Hono } from "hono";
import { db } from "../../db";
import { wardrobes } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

export const fashionRoutes = new Hono();

// GET /api/kits/fashion/items
fashionRoutes.get("/items", (c) => {
  const category = c.req.query("category");
  if (category) {
    const rows = db.select().from(wardrobes).where(eq(wardrobes.category, category)).all();
    return c.json(rows);
  }
  const rows = db.select().from(wardrobes).all();
  return c.json(rows);
});

// GET /api/kits/fashion/items/:id
fashionRoutes.get("/items/:id", (c) => {
  const { id } = c.req.param();
  const row = db.select().from(wardrobes).where(eq(wardrobes.id, id)).get();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/kits/fashion/items
fashionRoutes.post("/items", async (c) => {
  const body = await c.req.json();
  const id = randomUUIDv7();
  const now = new Date().toISOString();

  db.insert(wardrobes).values({
    id,
    name: body.name,
    category: body.category || null,
    brand: body.brand || null,
    color: body.color || null,
    style: body.style || null,
    purchaseDate: body.purchase_date || null,
    price: body.price || null,
    expenseId: body.expense_id || null,
    memo: body.memo || null,
    createdAt: now,
  }).run();

  const created = db.select().from(wardrobes).where(eq(wardrobes.id, id)).get();
  return c.json(created, 201);
});

// PATCH /api/kits/fashion/items/:id
fashionRoutes.patch("/items/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.category !== undefined) updates.category = body.category;
  if (body.brand !== undefined) updates.brand = body.brand;
  if (body.color !== undefined) updates.color = body.color;
  if (body.style !== undefined) updates.style = body.style;
  if (body.purchase_date !== undefined) updates.purchaseDate = body.purchase_date;
  if (body.price !== undefined) updates.price = body.price;
  if (body.expense_id !== undefined) updates.expenseId = body.expense_id;
  if (body.memo !== undefined) updates.memo = body.memo;

  db.update(wardrobes).set(updates).where(eq(wardrobes.id, id)).run();
  const updated = db.select().from(wardrobes).where(eq(wardrobes.id, id)).get();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

// DELETE /api/kits/fashion/items/:id
fashionRoutes.delete("/items/:id", (c) => {
  const { id } = c.req.param();
  db.delete(wardrobes).where(eq(wardrobes.id, id)).run();
  return c.json({ ok: true });
});
