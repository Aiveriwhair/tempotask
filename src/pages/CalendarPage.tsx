import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Pause, Plus, StickyNote } from "lucide-react";
import { listSessionsForRange, mergeSessions, type SessionWithActivity } from "../lib/sessions";
import { useTimer } from "../lib/TimerContext";
import { formatMinutes, formatTime } from "../lib/format";
import { minutesByDay, sessionMinutes } from "../lib/stats";
import ConfirmDialog from "../components/ConfirmDialog";
import SessionEditorModal from "../components/SessionEditorModal";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarPage() {
  const { activities, now } = useTimer();
  const [month, setMonth] = useState(() => new Date());
  const [sessions, setSessions] = useState<SessionWithActivity[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());
  const [editorState, setEditorState] = useState<
    { mode: "edit"; session: SessionWithActivity } | { mode: "create"; day: Date } | null
  >(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const rangeStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

  const loadSessions = () => {
    listSessionsForRange(rangeStart.toISOString(), rangeEnd.toISOString()).then(setSessions);
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const dayMinutes = useMemo(() => minutesByDay(sessions, now), [sessions, now]);

  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return [];
    return sessions
      .filter((s) => isSameDay(new Date(s.start_time), selectedDay))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [sessions, selectedDay]);

  function toggleSessionSelected(id: number) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMerge() {
    const ids = Array.from(selectedSessionIds);
    const picked = selectedDaySessions.filter((s) => ids.includes(s.id));
    const activityIds = new Set(picked.map((s) => s.activity_id));
    if (activityIds.size > 1) {
      setMergeError("Tu ne peux fusionner que des sessions de la même activité.");
      return;
    }
    await mergeSessions(ids);
    setSelectedSessionIds(new Set());
    loadSessions();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Calendrier</h1>
        <div className="calendar-nav">
          <button className="btn" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Mois précédent">
            <ChevronLeft size={15} />
          </button>
          <strong style={{ textTransform: "capitalize", minWidth: 140, textAlign: "center" }}>
            {format(month, "MMMM yyyy", { locale: fr })}
          </strong>
          <button className="btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Mois suivant">
            <ChevronRight size={15} />
          </button>
          <button className="btn" onClick={() => setMonth(new Date())}>
            Aujourd'hui
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="calendar-weekday-label">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const minutes = dayMinutes[key] ?? 0;
          const daySessions = sessions.filter((s) => isSameDay(new Date(s.start_time), day));
          return (
            <div
              key={key}
              className={`calendar-day ${isToday(day) ? "today" : ""} ${
                !isSameMonth(day, month) ? "outside" : ""
              }`}
              onClick={() => {
                setSelectedDay(day);
                setSelectedSessionIds(new Set());
              }}
            >
              <div className="calendar-day-number">{format(day, "d")}</div>
              {minutes > 0 && <div className="calendar-day-total">{formatMinutes(minutes)}</div>}
              {daySessions.slice(0, 2).map((s) => (
                <div key={s.id} className="session-chip" style={{ color: s.activity_color }}>
                  {s.activity_name}
                </div>
              ))}
              {daySessions.length > 2 && (
                <div className="session-chip">+{daySessions.length - 2} autres</div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="modal-overlay" onMouseDown={() => setSelectedDay(null)}>
          <div className="modal" style={{ width: 440 }} onMouseDown={(e) => e.stopPropagation()}>
            <h2 style={{ textTransform: "capitalize" }}>
              {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
            </h2>
            {selectedDaySessions.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Aucune session ce jour-là.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {selectedDaySessions.map((s) => (
                  <div
                    key={s.id}
                    className="card"
                    style={{
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                    onClick={() => setEditorState({ mode: "edit", session: s })}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.has(s.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSessionSelected(s.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.activity_name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {formatTime(s.start_time)} — {s.end_time ? formatTime(s.end_time) : "en cours"}
                      </div>
                      {s.note && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                            marginTop: 2,
                            fontStyle: "italic",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <StickyNote size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                          {s.note}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {formatMinutes(sessionMinutes(s, now))}
                      </div>
                      {/* Pauses (incl. gaps from merged sessions) are deducted: show the math. */}
                      {s.paused_duration_seconds >= 60 && (
                        <div className="pause-breakdown" title="Le temps de pause est déduit de la durée">
                          <Pause size={10} />
                          {formatMinutes(sessionMinutes(s, now) + s.paused_duration_seconds / 60)} −{" "}
                          {formatMinutes(s.paused_duration_seconds / 60)} de pause
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions" style={{ justifyContent: "space-between" }}>
              <button className="btn" onClick={() => setSelectedDay(null)}>
                Fermer
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedSessionIds.size >= 2 && (
                  <button className="btn" onClick={handleMerge}>
                    Fusionner ({selectedSessionIds.size})
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => setEditorState({ mode: "create", day: selectedDay })}
                >
                  <Plus size={14} style={{ verticalAlign: -2, marginRight: 3 }} />
                  Ajouter une session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mergeError && (
        <ConfirmDialog
          title="Fusion impossible"
          message={mergeError}
          cancelLabel="OK"
          onCancel={() => setMergeError(null)}
          actions={[]}
        />
      )}

      {editorState && (
        <SessionEditorModal
          session={editorState.mode === "edit" ? editorState.session : null}
          activities={activities}
          defaultStart={
            editorState.mode === "create"
              ? new Date(
                  editorState.day.getFullYear(),
                  editorState.day.getMonth(),
                  editorState.day.getDate(),
                  9
                ).toISOString()
              : undefined
          }
          onClose={() => setEditorState(null)}
          onSaved={loadSessions}
        />
      )}
    </div>
  );
}
