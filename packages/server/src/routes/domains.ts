import { Hono } from "hono";
import { db } from "../db";
import { domains } from "../db/schema";
import { eq } from "drizzle-orm";

export const domainRoutes = new Hono();

// GET /api/domains — 전체 도메인 목록
domainRoutes.get("/", (c) => {
  const result = db.select().from(domains).orderBy(domains.sortOrder).all();
  return c.json(result);
});

// GET /api/domains/:id — 단일 도메인 (하위 영역 포함)
domainRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  const domain = db.select().from(domains).where(eq(domains.id, id)).get();
  if (!domain) return c.json({ error: "Not found" }, 404);
  return c.json(domain);
});
