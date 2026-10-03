import { useState } from "react";
import type { Category } from "../lib/types";
import type { ActivityWithRunning } from "../lib/types";
import { createActivity, updateActivity } from "../lib/activities";
import { createCategory } from "../lib/categories";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#0ea5e9",
  "#64748b",
];

interface Props {
  activity: ActivityWithRunning | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onCategoriesChanged: () => void;
}

export default function ActivityFormModal({
  activity,
  categories,
  onClose,
  onSaved,
  onCategoriesChanged,
}: Props) {
  const [name, setName] = useState(activity?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(activity?.category_id ?? null);
  const [color, setColor] = useState(activity?.color ?? COLORS[0]);
  const [goalHours, setGoalHours] = useState(
    activity?.goal_minutes_per_week ? (activity.goal_minutes_per_week / 60).toString() : ""
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const id = await createCategory(trimmed, COLORS[Math.floor(Math.random() * COLORS.length)]);
    setNewCategoryName("");
    onCategoriesChanged();
    setCategoryId(id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const goalMinutes = goalHours.trim() ? Math.round(parseFloat(goalHours) * 60) : null;
    try {
      if (activity) {
        await updateActivity(activity.id, {
          name: name.trim(),
          category_id: categoryId,
          color,
          goal_minutes_per_week: goalMinutes,
        });
      } else {
        await createActivity({
          name: name.trim(),
          category_id: categoryId,
          color,
          goal_minutes_per_week: goalMinutes,
        });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{activity ? "Modifier l'activité" : "Nouvelle activité"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Nom</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Finir The Impossible Quiz"
              required
            />
          </div>

          <div className="form-row">
            <label>Catégorie</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Nouvelle catégorie</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nom de la catégorie"
              />
              <button type="button" className="btn" onClick={handleAddCategory}>
                +
              </button>
            </div>
          </div>

          <div className="form-row">
            <label>Couleur</label>
            <div className="color-swatches">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`swatch ${color === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Objectif hebdomadaire (heures, optionnel)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={goalHours}
              onChange={(e) => setGoalHours(e.target.value)}
              placeholder="Ex: 2"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {activity ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
