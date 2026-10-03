import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { listActivities } from "./activities";
import {
  listSessionsForRange,
  pauseSession,
  resumeSession,
  startSession,
  stopSession,
  updateSession,
} from "./sessions";
import type { SessionWithActivity } from "./sessions";
import { getLocalDayRange, totalMinutes } from "./stats";
import type { ActivityWithRunning } from "./types";

const LONG_SESSION_ALERT_MINUTES = 120;

interface TimerContextValue {
  activities: ActivityWithRunning[];
  loading: boolean;
  now: Date;
  todayMinutes: number;
  refresh: () => Promise<void>;
  runningActivity: ActivityWithRunning | null;
  isAnyRunning: (exceptActivityId?: number) => ActivityWithRunning | null;
  start: (activityId: number) => Promise<void>;
  stop: (activityId: number) => Promise<void>;
  toggle: (activityId: number) => Promise<void>;
  pause: (activityId: number) => Promise<void>;
  resume: (activityId: number) => Promise<void>;
  setRunningNote: (activityId: number, note: string) => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ActivityWithRunning[]>([]);
  const [todaySessions, setTodaySessions] = useState<SessionWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const notifiedSessions = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    const rows = await listActivities(false);
    setActivities(rows);
    setLoading(false);
    const { startIso, endIso } = getLocalDayRange(new Date());
    setTodaySessions(await listSessionsForRange(startIso, endIso));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Shared ticking clock for live elapsed-time displays across the app.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = useCallback(
    async (activityId: number) => {
      await startSession(activityId);
      await refresh();
    },
    [refresh]
  );

  const stop = useCallback(
    async (activityId: number) => {
      const activity = activities.find((a) => a.id === activityId);
      if (!activity?.running_session_id) return;
      await stopSession(activity.running_session_id);
      notifiedSessions.current.delete(activity.running_session_id);
      await refresh();
    },
    [activities, refresh]
  );

  const pause = useCallback(
    async (activityId: number) => {
      const activity = activities.find((a) => a.id === activityId);
      if (!activity?.running_session_id) return;
      await pauseSession(activity.running_session_id);
      await refresh();
    },
    [activities, refresh]
  );

  const resume = useCallback(
    async (activityId: number) => {
      const activity = activities.find((a) => a.id === activityId);
      if (!activity?.running_session_id) return;
      await resumeSession(activity.running_session_id);
      await refresh();
    },
    [activities, refresh]
  );

  const setRunningNote = useCallback(
    async (activityId: number, note: string) => {
      const activity = activities.find((a) => a.id === activityId);
      if (!activity?.running_session_id) return;
      await updateSession(activity.running_session_id, { note: note.trim() || null });
      await refresh();
    },
    [activities, refresh]
  );

  const isAnyRunning = useCallback(
    (exceptActivityId?: number) =>
      activities.find((a) => a.running_session_id && a.id !== exceptActivityId) ?? null,
    [activities]
  );

  const toggle = useCallback(
    async (activityId: number) => {
      const activity = activities.find((a) => a.id === activityId);
      if (activity?.running_session_id) {
        await stop(activityId);
      } else {
        await start(activityId);
      }
    },
    [activities, start, stop]
  );

  const todayMinutes = useMemo(() => totalMinutes(todaySessions, now), [todaySessions, now]);
  // Only re-invokes the tray once per whole minute instead of every tick.
  const todayMinutesBucket = Math.floor(todayMinutes);

  // Keep the tray dropdown in sync with the activity list / running state.
  useEffect(() => {
    if (loading) return;
    invoke("rebuild_tray_menu", {
      activities: activities.slice(0, 8).map((a) => ({
        id: a.id,
        name: a.name,
        running: a.running_session_id != null,
      })),
      todayMinutes: todayMinutesBucket,
    }).catch(() => {});
  }, [activities, loading, todayMinutesBucket]);

  // Let the tray dropdown trigger start/stop without opening the main window.
  useEffect(() => {
    const unlisten = listen<number>("tray://toggle-timer", (event) => {
      toggle(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [toggle]);

  // Warn with a system notification if a session has been running for a long time.
  useEffect(() => {
    const runningWithTime = activities.filter(
      (a) => a.running_session_id && a.running_start_time && !a.running_paused_at
    );
    for (const activity of runningWithTime) {
      const sessionId = activity.running_session_id as number;
      const start = new Date(activity.running_start_time as string);
      const pausedMinutes = (activity.running_paused_duration_seconds || 0) / 60;
      const minutes = (now.getTime() - start.getTime()) / 60000 - pausedMinutes;
      if (minutes >= LONG_SESSION_ALERT_MINUTES && !notifiedSessions.current.has(sessionId)) {
        notifiedSessions.current.add(sessionId);
        notify(`${activity.name} tourne depuis plus de ${Math.floor(minutes / 60)}h`);
      }
    }
  }, [now, activities]);

  const runningActivity = useMemo(
    () => activities.find((a) => a.running_session_id) ?? null,
    [activities]
  );

  const value: TimerContextValue = {
    activities,
    loading,
    now,
    todayMinutes,
    refresh,
    runningActivity,
    isAnyRunning,
    start,
    stop,
    toggle,
    pause,
    resume,
    setRunningNote,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

async function notify(body: string) {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (granted) {
      sendNotification({ title: "TempoTask", body });
    }
  } catch {
    // notifications are best-effort
  }
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
