import { useState } from "react";
import { Archive, Flame, Maximize2, Pause, Pencil, Star, Trash2 } from "lucide-react";
import type { ActivityWithRunning } from "../lib/types";
import { computeElapsedSeconds, formatSeconds } from "../lib/format";
import IconButton from "./IconButton";

interface Props {
  activity: ActivityWithRunning;
  now: Date;
  streak: number;
  completedSeconds: number;
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
  completedSeconds,
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
        <div className="card-icon-actions">
          <IconButton icon={Maximize2} label="Mode focus" onClick={onOpenFocus} />
          <IconButton
            icon={Star}
            label={activity.pinned ? "Désépingler" : "Épingler"}
            onClick={onTogglePin}
            active={!!activity.pinned}
          />
          <IconButton icon={Pencil} label="Modifier" onClick={onEdit} />
          <IconButton icon={Archive} label="Archiver" onClick={onArchive} />
          <IconButton icon={Trash2} label="Supprimer" onClick={onDelete} variant="danger" />
        </div>
      </div>

      <div>
        <div className="activity-name" title={activity.name}>
          {activity.name}
        </div>
        {streak > 0 && (
          <div className="activity-category">
            <Flame size={12} style={{ marginRight: 3 }} />
            {streak} j. de suite
          </div>
        )}
      </div>

      <div className="activity-timer">
        <span className={`elapsed ${isRunning && !isPaused ? "active" : ""} ${isRunning ? "" : "idle"}`}>
          {formatSeconds(isRunning ? elapsedSeconds : completedSeconds)}
          {isPaused && <Pause size={16} style={{ marginLeft: 8, verticalAlign: -3 }} />}
        </span>
        <span className="elapsed-caption">
          {isRunning
            ? `Session en cours · total ${formatSeconds(completedSeconds + elapsedSeconds)}`
            : "Temps total"}
        </span>
      </div>

      <div className="activity-actions">
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
          <button className="btn btn-start full-width" onClick={onStart}>
            Démarrer
          </button>
        )}
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
