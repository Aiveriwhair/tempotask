import { useState } from "react";
import type { ActivityWithRunning } from "../lib/types";
import { computeElapsedSeconds, formatSeconds } from "../lib/format";

interface Props {
  activity: ActivityWithRunning;
  now: Date;
  streak: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onOpenFocus: () => void;
  onNoteChange: (note: string) => void;
}

export default function ActivityCard({
  activity,
  now,
  streak,
  onStart,
  onStop,
  onPause,
  onResume,
  onEdit,
  onArchive,
  onDelete,
  onTogglePin,
  onOpenFocus,
  onNoteChange,
}: Props) {
  const [note, setNote] = useState(activity.running_note ?? "");
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
      className={`activity-card ${isRunning ? "running" : ""}`}
      style={{ ["--card-color" as string]: activity.color }}
    >
      <div className="activity-top">
        <div>
          <div className="activity-name">
            {activity.pinned ? "★ " : ""}
            {activity.name}
          </div>
          {streak > 0 && <div className="activity-category">🔥 {streak} j. de suite</div>}
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="btn-icon" title="Mode focus" onClick={onOpenFocus}>
            ⤢
          </button>
          <button className="btn-icon" title={activity.pinned ? "Désépingler" : "Épingler"} onClick={onTogglePin}>
            {activity.pinned ? "★" : "☆"}
          </button>
          <button className="btn-icon" title="Modifier" onClick={onEdit}>
            ✎
          </button>
          <button className="btn-icon" title="Archiver" onClick={onArchive}>
            🗄
          </button>
          <button className="btn-icon" title="Supprimer" onClick={onDelete}>
            ✕
          </button>
        </div>
      </div>

      <div className="activity-timer-row">
        <span className={`elapsed ${isRunning && !isPaused ? "active" : ""}`}>
          {isRunning ? formatSeconds(elapsedSeconds) : "00:00:00"}
          {isPaused ? " ⏸" : ""}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {isRunning ? (
            <>
              <button className="btn" onClick={isPaused ? onResume : onPause}>
                {isPaused ? "Reprendre" : "Pause"}
              </button>
              <button className="btn btn-stop" onClick={onStop}>
                Arrêter
              </button>
            </>
          ) : (
            <button className="btn btn-start" onClick={onStart}>
              Démarrer
            </button>
          )}
        </div>
      </div>

      {isRunning && (
        <textarea
          className="activity-note"
          placeholder="Ajouter une note pour cette session…"
          value={note}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => onNoteChange(note)}
        />
      )}
    </div>
  );
}
