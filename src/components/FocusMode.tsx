import { useEffect, useState } from "react";
import { Pause, X } from "lucide-react";
import { useTimer } from "../lib/TimerContext";
import { computeElapsedSeconds, formatSeconds } from "../lib/format";
import IconButton from "./IconButton";
import ShortcutBar from "./ShortcutBar";

interface Props {
  activityId: number;
  /** Total of the activity's completed sessions, excluding the running one. */
  completedSeconds: number;
  onClose: () => void;
}

export default function FocusMode({ activityId, completedSeconds, onClose }: Props) {
  const { activities, now, start, stop, pause, resume, playPause, setRunningNote } = useTimer();
  const activity = activities.find((a) => a.id === activityId);
  const [note, setNote] = useState(activity?.running_note ?? "");

  const isRunning = activity?.running_session_id != null;
  const isPaused = !!activity?.running_paused_at;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (!activity) return;
      // Ignore shortcuts while typing in the note field.
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        playPause(activity.id);
      } else if (e.code === "KeyS" && e.shiftKey && isRunning) {
        // Stopping ends the session, so it sits behind a modifier to avoid accidental presses.
        e.preventDefault();
        stop(activity.id);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activity, isRunning, onClose, stop, playPause]);

  if (!activity) return null;

  const elapsedSeconds = isRunning
    ? computeElapsedSeconds(
        activity.running_start_time as string,
        activity.running_paused_at,
        activity.running_paused_duration_seconds,
        now
      )
    : 0;

  const shortcuts = [
    { keys: "Espace", label: !isRunning ? "Démarrer" : isPaused ? "Reprendre" : "Pause" },
    ...(isRunning ? [{ keys: "⇧ S", label: "Arrêter" }] : []),
    { keys: "Esc", label: "Fermer" },
  ];

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
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <IconButton icon={X} label="Fermer" onClick={onClose} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: activity.color }}>{activity.name}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 80,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatSeconds(isRunning ? elapsedSeconds : completedSeconds)}
        {isPaused && <Pause size={44} />}
      </div>
      <div style={{ marginTop: -16, fontSize: 14, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
        {isRunning
          ? `Session en cours · total ${formatSeconds(completedSeconds + elapsedSeconds)}`
          : "Temps total"}
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
      <ShortcutBar shortcuts={shortcuts} />
    </div>
  );
}
