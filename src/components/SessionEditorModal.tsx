import { useState } from "react";
import type { SessionWithActivity } from "../lib/sessions";
import { addManualSession, deleteSession, updateSession } from "../lib/sessions";
import { formatDateTimeLocalInput, parseDateTimeLocalInput } from "../lib/format";
import type { ActivityWithRunning } from "../lib/types";

interface Props {
  session: SessionWithActivity | null;
  activities: ActivityWithRunning[];
  defaultActivityId?: number;
  defaultStart?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SessionEditorModal({
  session,
  activities,
  defaultActivityId,
  defaultStart,
  onClose,
  onSaved,
}: Props) {
  const [activityId, setActivityId] = useState<number>(
    session?.activity_id ?? defaultActivityId ?? activities[0]?.id
  );
  const [start, setStart] = useState(
    formatDateTimeLocalInput(session?.start_time ?? defaultStart ?? new Date().toISOString())
  );
  const [end, setEnd] = useState(
    formatDateTimeLocalInput(session?.end_time ?? new Date().toISOString())
  );
  const [note, setNote] = useState(session?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const startIso = parseDateTimeLocalInput(start);
      const endIso = parseDateTimeLocalInput(end);
      if (session) {
        await updateSession(session.id, {
          start_time: startIso,
          end_time: endIso,
          note: note || null,
        });
      } else {
        await addManualSession(activityId, startIso, endIso, note || null);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    await deleteSession(session.id);
    onSaved();
    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{session ? "Modifier la session" : "Ajouter une session"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Activité</label>
            <select value={activityId} onChange={(e) => setActivityId(Number(e.target.value))}>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Début</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>

          <div className="form-row">
            <label>Fin</label>
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>

          <div className="form-row">
            <label>Note (optionnel)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <div className="form-actions">
            {session && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Supprimer
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
