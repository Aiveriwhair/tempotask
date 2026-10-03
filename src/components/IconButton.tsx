import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  active?: boolean;
}

// Fixed-size icon button with a built-in hover tooltip (shows the `label`).
export default function IconButton({ icon: Icon, label, onClick, variant = "default", active }: Props) {
  return (
    <button
      type="button"
      className={`icon-btn ${variant === "danger" ? "icon-btn-danger" : ""} ${active ? "active" : ""}`}
      data-tooltip={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
}
