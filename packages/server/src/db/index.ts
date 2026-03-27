import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { mkdirSync, existsSync } from "fs";

// Ensure data directory exists
if (!existsSync("data")) {
  mkdirSync("data", { recursive: true });
}

const sqlite = new Database("data/lifekit.db");

// Enable WAL mode for better performance
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export { sqlite };
