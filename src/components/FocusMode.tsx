import { useEffect, useState } from "react";
import { useTimer } from "../lib/TimerContext";
import { computeElapsedSeconds, formatSeconds } from "../lib/format";

interface Props {
  activityId: number;
  onClose: () => void;
}

export default function FocusMode({ activityId, onClose }: Props) {
  const { activities, now, start, stop, pause, resume, setRunningNote } = useTimer();
  const activity = activities.find((a) => a.id === activityId);
  const [note, setNote] = useState(activity?.running_note ?? "");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!activity) return null;

  const isRunning = activity.running_session_id != null;
  const isPaused = !!activity.running_paused_at;
  const elapsedSeconds = isRunning
    ? computeElapsedSeconds(
        activity.running_start_time as string,
        activity.running_paused_at,
        activity.running_paused_duration_seconds,
        now
      )
    : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <button className="btn" style={{ position: "absolute", top: 24, right: 24 }} onClick={onClose}>
        Fermer (Esc)
      </button>
      <div style={{ fontSize: 22, fontWeight: 600, color: activity.color }}>{activity.name}</div>
      <div style={{ fontSize: 80, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatSeconds(elapsedSeconds)}
        {isPaused ? " ⏸" : ""}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {isRunning ? (
          <>
            <button className="btn" style={{ padding: "10px 24px" }} onClick={() => (isPaused ? resume(activity.id) : pause(activity.id))}>
              {isPaused ? "Reprendre" : "Pause"}
            </button>
            <button className="btn btn-stop" style={{ padding: "10px 24px" }} onClick={() => stop(activity.id)}>
              Arrêter
            </button>
          </>
        ) : (
          <button className="btn btn-start" style={{ padding: "10px 24px" }} onClick={() => start(activity.id)}>
            Démarrer
          </button>
        )}
      </div>
      {isRunning && (
        <textarea
          className="activity-note"
          style={{ width: 360, maxWidth: "80vw" }}
          placeholder="Ajouter une note pour cette session…"
          value={note}
          rows={3}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setRunningNote(activity.id, note)}
        />
      )}
    </div>
  );
}
