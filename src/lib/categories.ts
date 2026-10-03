import { getDb } from "./db";
import type { Category } from "./types";

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select<Category[]>(
    `SELECT * FROM categories ORDER BY name COLLATE NOCASE`,
  );
}

export async function createCategory(
  name: string,
  color: string,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO categories (name, color) VALUES ($1, $2)`,
    [name, color],
  );
  return result.lastInsertId as number;
}
