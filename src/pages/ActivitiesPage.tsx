import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Plus, Search, Trash2 } from "lucide-react";
import { useTimer } from "../lib/TimerContext";
import { listCategories } from "../lib/categories";
import {
  deleteActivity,
  listArchivedActivities,
  setActivityArchived,
  setActivityPinned,
} from "../lib/activities";
import { listSessionsSince, totalSecondsByActivity, type SessionWithActivity } from "../lib/sessions";
import { computeStreak } from "../lib/stats";
import type { Activity, Category } from "../lib/types";
import type { ActivityWithRunning } from "../lib/types";
import ActivityFormModal from "../components/ActivityFormModal";
import ActivityCard from "../components/ActivityCard";
import ConfirmDialog from "../components/ConfirmDialog";
import FocusMode from "../components/FocusMode";
import IconButton from "../components/IconButton";

const STREAK_LOOKBACK_DAYS = 120;

export default function ActivitiesPage() {
  const { activities, loading, now, start, stop, pause, resume, setRunningNote, isAnyRunning, refresh } =
    useTimer();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<ActivityWithRunning | null | "new">(null);
  const [pendingStart, setPendingStart] = useState<ActivityWithRunning | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [focusActivityId, setFocusActivityId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [recentSessions, setRecentSessions] = useState<SessionWithActivity[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedActivities, setArchivedActivities] = useState<Activity[]>([]);
  const [totalSeconds, setTotalSeconds] = useState<Map<number, number>>(new Map());

  const loadCategories = () => listCategories().then(setCategories);
  const loadArchived = () => listArchivedActivities().then(setArchivedActivities);

  useEffect(() => {
    loadCategories();
  }, []);

  // `activities` is reloaded after every start/stop/pause, so totals and streaks
  // stay in sync with the sessions that just ended.
  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - STREAK_LOOKBACK_DAYS);
    listSessionsSince(since.toISOString()).then(setRecentSessions);
    totalSecondsByActivity().then(setTotalSeconds);
  }, [activities]);

  useEffect(() => {
    if (showArchived) loadArchived();
  }, [showArchived]);

  const streaksByActivity = useMemo(() => {
    const map = new Map<number, SessionWithActivity[]>();
    for (const s of recentSessions) {
      if (!map.has(s.activity_id)) map.set(s.activity_id, []);
      map.get(s.activity_id)!.push(s);
    }
    const streaks = new Map<number, number>();
    for (const [activityId, sessions] of map) {
      streaks.set(activityId, computeStreak(sessions, now));
    }
    return streaks;
  }, [recentSessions, now]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return activities;
    return activities.filter((a) => a.name.toLowerCase().includes(query));
  }, [activities, search]);

  const pinned = useMemo(() => filtered.filter((a) => a.pinned), [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityWithRunning[]>();
    for (const activity of filtered) {
      if (activity.pinned) continue;
      const category = categories.find((c) => c.id === activity.category_id);
      const label = category?.name ?? "Sans catégorie";
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(activity);
    }
    return Array.from(map.entries());
  }, [filtered, categories]);

  function handleStartClick(activity: ActivityWithRunning) {
    const other = isAnyRunning(activity.id);
    if (other) {
      setPendingStart(activity);
    } else {
      start(activity.id);
    }
  }

  async function handleArchive(activity: ActivityWithRunning) {
    await setActivityArchived(activity.id, true);
    refresh();
  }

  async function handleRestore(activity: Activity) {
    await setActivityArchived(activity.id, false);
    await loadArchived();
    refresh();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteActivity(deleteTarget.id);
    setDeleteTarget(null);
    if (showArchived) await loadArchived();
    refresh();
  }

  async function handleTogglePin(activity: ActivityWithRunning) {
    await setActivityPinned(activity.id, !activity.pinned);
    refresh();
  }

  function renderCard(activity: ActivityWithRunning) {
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        now={now}
        streak={streaksByActivity.get(activity.id) ?? 0}
        completedSeconds={totalSeconds.get(activity.id) ?? 0}
        onStart={() => handleStartClick(activity)}
        onStop={() => stop(activity.id)}
        onPause={() => pause(activity.id)}
        onResume={() => resume(activity.id)}
        onEdit={() => setEditing(activity)}
        onArchive={() => handleArchive(activity)}
        onDelete={() => setDeleteTarget({ id: activity.id, name: activity.name })}
        onTogglePin={() => handleTogglePin(activity)}
        onOpenFocus={() => setFocusActivityId(activity.id)}
        onNoteChange={(note) => setRunningNote(activity.id, note)}
      />
    );
  }

  if (loading) return <div className="empty-state">Chargement…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Activités</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <IconButton
            icon={Archive}
            label={showArchived ? "Masquer les archivées" : "Voir les archivées"}
            onClick={() => setShowArchived((v) => !v)}
            active={showArchived}
          />
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={15} style={{ verticalAlign: -2, marginRight: 4 }} />
            Nouvelle activité
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search
          size={15}
          style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une activité…"
          style={{
            width: "100%",
            padding: "9px 12px 9px 32px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        />
      </div>

      {showArchived && (
        <div style={{ marginBottom: 22 }}>
          <h3 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Archivées</h3>
          {archivedActivities.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              Aucune activité archivée.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {archivedActivities.map((a) => (
                <div key={a.id} className="archived-row">
                  <span style={{ fontSize: 13.5 }}>{a.name}</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    <IconButton icon={ArchiveRestore} label="Restaurer" onClick={() => handleRestore(a)} />
                    <IconButton
                      icon={Trash2}
                      label="Supprimer"
                      variant="danger"
                      onClick={() => setDeleteTarget({ id: a.id, name: a.name })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activities.length === 0 ? (
        <div className="empty-state">
          Aucune activité pour l'instant. Crée ta première activité pour commencer à suivre ton temps.
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Aucune activité ne correspond à ta recherche.</div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
                Épinglées
              </h3>
              <div className="activity-grid">{pinned.map(renderCard)}</div>
            </div>
          )}
          {grouped.map(([label, items]) => (
            <div key={label} style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>{label}</h3>
              <div className="activity-grid">{items.map(renderCard)}</div>
            </div>
          ))}
        </>
      )}

      {editing && (
        <ActivityFormModal
          activity={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={refresh}
          onCategoriesChanged={loadCategories}
        />
      )}

      {pendingStart && (
        <ConfirmDialog
          title="Un autre timer tourne déjà"
          message={`"${isAnyRunning(pendingStart.id)?.name}" est en cours. Que veux-tu faire ?`}
          onCancel={() => setPendingStart(null)}
          actions={[
            {
              label: "Démarrer les deux",
              onClick: () => {
                start(pendingStart.id);
                setPendingStart(null);
              },
            },
            {
              label: "Arrêter l'autre et démarrer",
              variant: "primary",
              onClick: async () => {
                const other = isAnyRunning(pendingStart.id);
                if (other) await stop(other.id);
                await start(pendingStart.id);
                setPendingStart(null);
              },
            },
          ]}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer l'activité"
          message={`Supprimer définitivement "${deleteTarget.name}" et toutes ses sessions ? Cette action est irréversible.`}
          onCancel={() => setDeleteTarget(null)}
          actions={[
            {
              label: "Supprimer",
              variant: "danger",
              onClick: handleConfirmDelete,
            },
          ]}
        />
      )}

      {focusActivityId != null && (
        <FocusMode activityId={focusActivityId} onClose={() => setFocusActivityId(null)} />
      )}
    </div>
  );
}
