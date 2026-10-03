import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { listAllSessions, type SessionWithActivity } from "../lib/sessions";
import { useTimer } from "../lib/TimerContext";
import {
  compareWeekToPrevious,
  computePersonalRecords,
  computeStreak,
  minutesByActivity,
  minutesByDay,
  totalMinutes,
  weeklyGoalProgress,
} from "../lib/stats";
import { formatMinutes } from "../lib/format";
import { downloadStatsImage } from "../lib/shareImage";
import Heatmap from "../components/Heatmap";

export default function StatsPage() {
  const { activities, now } = useTimer();
  const [sessions, setSessions] = useState<SessionWithActivity[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listAllSessions().then(setSessions);
  }, []);

  const total = totalMinutes(sessions, now);
  const byDay = useMemo(() => minutesByDay(sessions, now), [sessions, now]);
  const byActivity = useMemo(() => minutesByActivity(sessions, now), [sessions, now]);
  const goals = useMemo(() => weeklyGoalProgress(activities, sessions, now), [activities, sessions, now]);
  const weekComparison = useMemo(() => compareWeekToPrevious(sessions, now), [sessions, now]);
  const records = useMemo(() => computePersonalRecords(sessions, now), [sessions, now]);

  const bestStreak = useMemo(() => {
    const byActivityId = new Map<number, SessionWithActivity[]>();
    for (const s of sessions) {
      if (!byActivityId.has(s.activity_id)) byActivityId.set(s.activity_id, []);
      byActivityId.get(s.activity_id)!.push(s);
    }
    let best = { name: null as string | null, streak: 0 };
    for (const [, activitySessions] of byActivityId) {
      const streak = computeStreak(activitySessions, now);
      if (streak > best.streak) {
        best = { name: activitySessions[0]?.activity_name ?? null, streak };
      }
    }
    return best;
  }, [sessions, now]);

  const last14Days = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const day = subDays(now, i);
      const key = format(day, "yyyy-MM-dd");
      arr.push({ day: format(day, "dd/MM"), minutes: byDay[key] ?? 0 });
    }
    return arr;
  }, [byDay, now]);

  const last7DaysKeys = Array.from({ length: 7 }, (_, i) => format(subDays(now, i), "yyyy-MM-dd"));
  const totalThisWeek = last7DaysKeys.reduce((sum, k) => sum + (byDay[k] ?? 0), 0);

  async function handleExportImage() {
    setExporting(true);
    try {
      await downloadStatsImage({
        totalLabel: formatMinutes(total),
        weekLabel: formatMinutes(weekComparison.currentMinutes),
        topActivityName: byActivity[0]?.name ?? null,
        longestSessionLabel:
          records.longestSessionMinutes > 0 ? formatMinutes(records.longestSessionMinutes) : "—",
        bestWeekLabel: records.bestWeekMinutes > 0 ? formatMinutes(records.bestWeekMinutes) : "—",
        bestStreakLabel: bestStreak.streak > 0 ? `${bestStreak.streak} jours` : "—",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Stats</h1>
        <button className="btn" onClick={handleExportImage} disabled={exporting}>
          {exporting ? "Génération…" : "📸 Exporter en image"}
        </button>
      </div>

      <div className="stats-grid">
        <div className="card stat-tile">
          <div className="value">{formatMinutes(total)}</div>
          <div className="label">Temps total suivi</div>
        </div>
        <div className="card stat-tile">
          <div className="value">{formatMinutes(totalThisWeek)}</div>
          <div className="label">7 derniers jours</div>
        </div>
        <div className="card stat-tile">
          <div className="value">{sessions.length}</div>
          <div className="label">Sessions enregistrées</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 13.5 }}>14 derniers jours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last14Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" fontSize={11} stroke="var(--text-muted)" />
            <YAxis fontSize={11} stroke="var(--text-muted)" />
            <Tooltip
              formatter={(value) => formatMinutes(Number(value))}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            />
            <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 13.5 }}>Temps par activité</h3>
        {byActivity.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Pas encore de données.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byActivity.map((a) => {
              const pct = total > 0 ? (a.minutes / total) * 100 : 0;
              return (
                <div key={a.activity_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span>{a.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{formatMinutes(a.minutes)}</span>
                  </div>
                  <div className="goal-bar-track">
                    <div
                      className="goal-bar-fill"
                      style={{ width: `${pct}%`, background: a.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {goals.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 13.5 }}>Objectifs de la semaine</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {goals.map((g) => (
              <div key={g.activity.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>{g.activity.name}</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {formatMinutes(g.minutesThisWeek)} / {formatMinutes(g.goalMinutes)}
                  </span>
                </div>
                <div className="goal-bar-track">
                  <div
                    className="goal-bar-fill"
                    style={{
                      width: `${g.progress * 100}%`,
                      background: g.progress >= 1 ? "var(--success)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="card stat-tile">
          <div className="value">
            {formatMinutes(weekComparison.currentMinutes)}
            {weekComparison.diffPercent != null && (
              <span
                style={{
                  fontSize: 14,
                  marginLeft: 8,
                  fontWeight: 600,
                  color: weekComparison.diffPercent >= 0 ? "var(--success)" : "var(--danger)",
                }}
              >
                {weekComparison.diffPercent >= 0 ? "+" : ""}
                {Math.round(weekComparison.diffPercent)}%
              </span>
            )}
          </div>
          <div className="label">Cette semaine vs semaine dernière</div>
        </div>
        <div className="card stat-tile">
          <div className="value">
            {records.longestSessionMinutes > 0 ? formatMinutes(records.longestSessionMinutes) : "—"}
          </div>
          <div className="label">
            Session la plus longue{records.longestSessionActivity ? ` — ${records.longestSessionActivity}` : ""}
          </div>
        </div>
        <div className="card stat-tile">
          <div className="value">{records.bestWeekMinutes > 0 ? formatMinutes(records.bestWeekMinutes) : "—"}</div>
          <div className="label">
            Meilleure semaine{records.bestWeekLabel ? ` (${records.bestWeekLabel})` : ""}
          </div>
        </div>
        <div className="card stat-tile">
          <div className="value">{bestStreak.streak > 0 ? `🔥 ${bestStreak.streak}` : "—"}</div>
          <div className="label">
            Meilleure série{bestStreak.name ? ` — ${bestStreak.name}` : ""}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 13.5 }}>Activité des 6 derniers mois</h3>
        <Heatmap data={byDay} />
      </div>
    </div>
  );
}
