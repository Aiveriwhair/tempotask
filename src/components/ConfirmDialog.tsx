interface ConfirmAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "default";
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  actions: ConfirmAction[];
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, actions, onCancel }: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>{message}</p>
        <div className="form-actions">
          <button className="btn" onClick={onCancel}>
            Annuler
          </button>
          {actions.map((action) => (
            <button
              key={action.label}
              className={`btn ${action.variant === "primary" ? "btn-primary" : ""} ${
                action.variant === "danger" ? "btn-danger" : ""
              }`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
