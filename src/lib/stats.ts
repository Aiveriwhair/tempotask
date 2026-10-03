import {
  differenceInMinutes,
  format,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
} from "date-fns";
import type { Activity } from "./types";
import type { SessionWithActivity } from "./sessions";

export function getLocalDayRange(date: Date): {
  startIso: string;
  endIso: string;
} {
  return {
    startIso: startOfDay(date).toISOString(),
    endIso: endOfDay(date).toISOString(),
  };
}

export function sessionMinutes(
  session: SessionWithActivity,
  now: Date = new Date(),
): number {
  const start = new Date(session.start_time);
  // While paused, elapsed time freezes at the pause instant instead of ticking with `now`.
  const end = session.paused_at
    ? new Date(session.paused_at)
    : session.end_time
      ? new Date(session.end_time)
      : now;
  const pausedMinutes = (session.paused_duration_seconds || 0) / 60;
  return Math.max(0, differenceInMinutes(end, start) - pausedMinutes);
}

export function totalMinutes(
  sessions: SessionWithActivity[],
  now?: Date,
): number {
  return sessions.reduce((sum, s) => sum + sessionMinutes(s, now), 0);
}

export function minutesByDay(
  sessions: SessionWithActivity[],
  now?: Date,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    const day = s.start_time.slice(0, 10);
    map[day] = (map[day] ?? 0) + sessionMinutes(s, now);
  }
  return map;
}

export interface ActivityMinutes {
  activity_id: number;
  name: string;
  color: string;
  minutes: number;
}

export function minutesByActivity(
  sessions: SessionWithActivity[],
  now?: Date,
): ActivityMinutes[] {
  const map = new Map<number, ActivityMinutes>();
  for (const s of sessions) {
    const existing = map.get(s.activity_id);
    const minutes = sessionMinutes(s, now);
    if (existing) {
      existing.minutes += minutes;
    } else {
      map.set(s.activity_id, {
        activity_id: s.activity_id,
        name: s.activity_name,
        color: s.activity_color,
        minutes,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
}

export interface GoalProgress {
  activity: Activity;
  minutesThisWeek: number;
  goalMinutes: number;
  progress: number;
}

export function weeklyGoalProgress(
  activities: Activity[],
  sessions: SessionWithActivity[],
  now: Date = new Date(),
): GoalProgress[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return activities
    .filter((a) => a.goal_minutes_per_week && a.goal_minutes_per_week > 0)
    .map((activity) => {
      const minutesThisWeek = sessions
        .filter(
          (s) =>
            s.activity_id === activity.id &&
            isWithinInterval(new Date(s.start_time), {
              start: weekStart,
              end: weekEnd,
            }),
        )
        .reduce((sum, s) => sum + sessionMinutes(s, now), 0);
      const goalMinutes = activity.goal_minutes_per_week ?? 0;
      return {
        activity,
        minutesThisWeek,
        goalMinutes,
        progress:
          goalMinutes > 0 ? Math.min(1, minutesThisWeek / goalMinutes) : 0,
      };
    });
}

// Consecutive days (ending today or yesterday) with at least one session for the activity.
export function computeStreak(
  sessions: SessionWithActivity[],
  now: Date = new Date(),
): number {
  const days = new Set(sessions.map((s) => s.start_time.slice(0, 10)));
  let cursor = now;
  if (!days.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = subDays(cursor, 1);
  }
  let streak = 0;
  while (days.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface WeekComparison {
  currentMinutes: number;
  previousMinutes: number;
  diffPercent: number | null;
}

export function compareWeekToPrevious(
  sessions: SessionWithActivity[],
  now: Date = new Date(),
): WeekComparison {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const currentMinutes = sessions
    .filter((s) =>
      isWithinInterval(new Date(s.start_time), {
        start: weekStart,
        end: weekEnd,
      }),
    )
    .reduce((sum, s) => sum + sessionMinutes(s, now), 0);
  const previousMinutes = sessions
    .filter((s) =>
      isWithinInterval(new Date(s.start_time), {
        start: prevStart,
        end: prevEnd,
      }),
    )
    .reduce((sum, s) => sum + sessionMinutes(s, now), 0);

  const diffPercent =
    previousMinutes > 0
      ? ((currentMinutes - previousMinutes) / previousMinutes) * 100
      : null;

  return { currentMinutes, previousMinutes, diffPercent };
}

export interface PersonalRecords {
  longestSessionMinutes: number;
  longestSessionActivity: string | null;
  bestWeekMinutes: number;
  bestWeekLabel: string | null;
}

export function computePersonalRecords(
  sessions: SessionWithActivity[],
  now: Date = new Date(),
): PersonalRecords {
  let longestSessionMinutes = 0;
  let longestSessionActivity: string | null = null;
  for (const s of sessions) {
    const minutes = sessionMinutes(s, now);
    if (minutes > longestSessionMinutes) {
      longestSessionMinutes = minutes;
      longestSessionActivity = s.activity_name;
    }
  }

  const weekTotals = new Map<string, number>();
  for (const s of sessions) {
    const weekKey = format(
      startOfWeek(new Date(s.start_time), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    weekTotals.set(
      weekKey,
      (weekTotals.get(weekKey) ?? 0) + sessionMinutes(s, now),
    );
  }
  let bestWeekMinutes = 0;
  let bestWeekLabel: string | null = null;
  for (const [weekKey, minutes] of weekTotals) {
    if (minutes > bestWeekMinutes) {
      bestWeekMinutes = minutes;
      bestWeekLabel = format(new Date(weekKey), "dd/MM/yyyy");
    }
  }

  return {
    longestSessionMinutes,
    longestSessionActivity,
    bestWeekMinutes,
    bestWeekLabel,
  };
}
