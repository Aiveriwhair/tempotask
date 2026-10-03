import { getDb } from "./db";
import type { Activity, ActivityWithRunning } from "./types";

export async function listActivities(
  includeArchived = false,
): Promise<ActivityWithRunning[]> {
  const db = await getDb();
  const rows = await db.select<ActivityWithRunning[]>(
    `SELECT a.*, s.id as running_session_id, s.start_time as running_start_time,
            s.paused_at as running_paused_at, s.paused_duration_seconds as running_paused_duration_seconds,
            s.note as running_note
     FROM activities a
     LEFT JOIN sessions s ON s.activity_id = a.id AND s.end_time IS NULL
     WHERE a.archived = 0 OR $1 = 1
     ORDER BY a.pinned DESC, a.name COLLATE NOCASE`,
    [includeArchived ? 1 : 0],
  );
  return rows;
}

export async function createActivity(input: {
  name: string;
  category_id: number | null;
  color: string;
  goal_minutes_per_week: number | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO activities (name, category_id, color, goal_minutes_per_week) VALUES ($1, $2, $3, $4)`,
    [input.name, input.category_id, input.color, input.goal_minutes_per_week],
  );
  return result.lastInsertId as number;
}

export async function updateActivity(
  id: number,
  input: Partial<
    Pick<Activity, "name" | "category_id" | "color" | "goal_minutes_per_week">
  >,
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(input);
  if (fields.length === 0) return;
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const values = fields.map((f) => (input as Record<string, unknown>)[f]);
  await db.execute(`UPDATE activities SET ${setClause} WHERE id = $1`, [
    id,
    ...values,
  ]);
}

export async function setActivityArchived(
  id: number,
  archived: boolean,
): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE activities SET archived = $2 WHERE id = $1`, [
    id,
    archived ? 1 : 0,
  ]);
}

export async function setActivityPinned(
  id: number,
  pinned: boolean,
): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE activities SET pinned = $2 WHERE id = $1`, [
    id,
    pinned ? 1 : 0,
  ]);
}

export async function deleteActivity(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM activities WHERE id = $1`, [id]);
}
