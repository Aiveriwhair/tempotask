import { getDb } from "./db";
import type { Category, Activity, Session } from "./types";

interface BackupPayload {
  version: 1;
  exportedAt: string;
  categories: Category[];
  activities: Activity[];
  sessions: Session[];
}

export async function exportAllDataJson(): Promise<void> {
  const db = await getDb();
  const categories = await db.select<Category[]>(`SELECT * FROM categories`);
  const activities = await db.select<Activity[]>(`SELECT * FROM activities`);
  const sessions = await db.select<Session[]>(`SELECT * FROM sessions`);

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    activities,
    sessions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tempotask-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Imports a backup by inserting everything as new rows (ids are remapped), so importing
// twice simply duplicates data rather than overwriting or losing anything.
export async function importAllDataJson(
  file: File,
): Promise<{ categories: number; activities: number; sessions: number }> {
  const text = await file.text();
  const payload = JSON.parse(text) as Partial<BackupPayload>;
  if (
    !payload ||
    !Array.isArray(payload.activities) ||
    !Array.isArray(payload.sessions)
  ) {
    throw new Error("Fichier de sauvegarde invalide");
  }

  const db = await getDb();
  const categoryIdMap = new Map<number, number>();

  for (const category of payload.categories ?? []) {
    const existing = await db.select<Category[]>(
      `SELECT id FROM categories WHERE name = $1`,
      [category.name],
    );
    if (existing.length > 0) {
      categoryIdMap.set(category.id, existing[0].id);
    } else {
      const result = await db.execute(
        `INSERT INTO categories (name, color) VALUES ($1, $2)`,
        [category.name, category.color],
      );
      categoryIdMap.set(category.id, result.lastInsertId as number);
    }
  }

  const activityIdMap = new Map<number, number>();
  for (const activity of payload.activities) {
    const newCategoryId = activity.category_id
      ? (categoryIdMap.get(activity.category_id) ?? null)
      : null;
    const result = await db.execute(
      `INSERT INTO activities (name, category_id, color, goal_minutes_per_week, archived, pinned) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        activity.name,
        newCategoryId,
        activity.color,
        activity.goal_minutes_per_week,
        activity.archived ?? 0,
        activity.pinned ?? 0,
      ],
    );
    activityIdMap.set(activity.id, result.lastInsertId as number);
  }

  let importedSessions = 0;
  for (const session of payload.sessions) {
    const newActivityId = activityIdMap.get(session.activity_id);
    if (!newActivityId) continue;
    await db.execute(
      `INSERT INTO sessions (activity_id, start_time, end_time, note, paused_duration_seconds) VALUES ($1, $2, $3, $4, $5)`,
      [
        newActivityId,
        session.start_time,
        session.end_time,
        session.note,
        session.paused_duration_seconds ?? 0,
      ],
    );
    importedSessions++;
  }

  return {
    categories: categoryIdMap.size,
    activities: activityIdMap.size,
    sessions: importedSessions,
  };
}
