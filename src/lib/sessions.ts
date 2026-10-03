import { getDb } from "./db";
import type { Session } from "./types";

export async function startSession(activityId: number): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.execute(
    `INSERT INTO sessions (activity_id, start_time, end_time) VALUES ($1, $2, NULL)`,
    [activityId, now],
  );
  return result.lastInsertId as number;
}

export async function stopSession(sessionId: number): Promise<void> {
  const db = await getDb();
  // Folds any in-progress pause into paused_duration_seconds before closing the session.
  await resumeSession(sessionId);
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE sessions SET end_time = $2, updated_at = $2 WHERE id = $1`,
    [sessionId, now],
  );
}

export async function pauseSession(sessionId: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE sessions SET paused_at = $2, updated_at = $2 WHERE id = $1 AND paused_at IS NULL`,
    [sessionId, now],
  );
}

export async function resumeSession(sessionId: number): Promise<void> {
  const db = await getDb();
  const rows = await db.select<Session[]>(
    `SELECT * FROM sessions WHERE id = $1`,
    [sessionId],
  );
  const session = rows[0];
  if (!session || !session.paused_at) return;
  const pausedMs = Date.now() - new Date(session.paused_at).getTime();
  const extraSeconds = Math.max(0, Math.round(pausedMs / 1000));
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE sessions SET paused_at = NULL, paused_duration_seconds = paused_duration_seconds + $2, updated_at = $3 WHERE id = $1`,
    [sessionId, extraSeconds, now],
  );
}

export async function updateSession(
  id: number,
  input: {
    start_time?: string;
    end_time?: string | null;
    note?: string | null;
  },
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(input);
  if (fields.length === 0) return;
  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
  const values = fields.map((f) => (input as Record<string, unknown>)[f]);
  await db.execute(
    `UPDATE sessions SET ${setClause}, updated_at = datetime('now') WHERE id = $1`,
    [id, ...values],
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM sessions WHERE id = $1`, [id]);
}

export async function addManualSession(
  activityId: number,
  startTime: string,
  endTime: string,
  note: string | null,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO sessions (activity_id, start_time, end_time, note) VALUES ($1, $2, $3, $4)`,
    [activityId, startTime, endTime, note],
  );
  return result.lastInsertId as number;
}

export interface SessionWithActivity extends Session {
  activity_name: string;
  activity_color: string;
}

export async function listSessionsForRange(
  startIso: string,
  endIso: string,
): Promise<SessionWithActivity[]> {
  const db = await getDb();
  return db.select<SessionWithActivity[]>(
    `SELECT s.*, a.name as activity_name, a.color as activity_color
     FROM sessions s
     JOIN activities a ON a.id = s.activity_id
     WHERE s.start_time >= $1 AND s.start_time < $2
     ORDER BY s.start_time ASC`,
    [startIso, endIso],
  );
}

export async function listAllSessions(): Promise<SessionWithActivity[]> {
  const db = await getDb();
  return db.select<SessionWithActivity[]>(
    `SELECT s.*, a.name as activity_name, a.color as activity_color
     FROM sessions s
     JOIN activities a ON a.id = s.activity_id
     ORDER BY s.start_time ASC`,
  );
}

export async function listSessionsSince(
  startIso: string,
): Promise<SessionWithActivity[]> {
  const db = await getDb();
  return db.select<SessionWithActivity[]>(
    `SELECT s.*, a.name as activity_name, a.color as activity_color
     FROM sessions s
     JOIN activities a ON a.id = s.activity_id
     WHERE s.start_time >= $1
     ORDER BY s.start_time ASC`,
    [startIso],
  );
}

// Merges sessions of the same activity into a single session spanning their full range.
export async function mergeSessions(sessionIds: number[]): Promise<void> {
  if (sessionIds.length < 2) return;
  const db = await getDb();
  const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await db.select<Session[]>(
    `SELECT * FROM sessions WHERE id IN (${placeholders})`,
    sessionIds,
  );
  if (rows.length < 2) return;
  const activityId = rows[0].activity_id;
  const start = rows.reduce(
    (min, s) => (s.start_time < min ? s.start_time : min),
    rows[0].start_time,
  );
  const ends = rows.map((s) => s.end_time ?? new Date().toISOString());
  const end = ends.reduce((max, e) => (e > max ? e : max), ends[0]);
  const pausedTotal = rows.reduce(
    (sum, s) => sum + (s.paused_duration_seconds || 0),
    0,
  );
  const note =
    rows
      .map((s) => s.note)
      .filter(Boolean)
      .join(" / ") || null;

  await db.execute(
    `INSERT INTO sessions (activity_id, start_time, end_time, note, paused_duration_seconds) VALUES ($1, $2, $3, $4, $5)`,
    [activityId, start, end, note, pausedTotal],
  );
  await db.execute(
    `DELETE FROM sessions WHERE id IN (${placeholders})`,
    sessionIds,
  );
}
