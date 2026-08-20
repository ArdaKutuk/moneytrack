import type Database from "better-sqlite3";
import type { Category } from "@shared/types";

export function listCategories(db: Database.Database): Category[] {
  return db.prepare("SELECT * FROM categories ORDER BY type, name").all() as Category[];
}

export function getCategory(db: Database.Database, id: number): Category | undefined {
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined;
}
