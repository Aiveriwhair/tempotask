interface Shortcut {
  keys: string;
  label: string;
}

interface Props {
  shortcuts: Shortcut[];
}

// Modern command-bar style footer listing the available keyboard shortcuts.
export default function ShortcutBar({ shortcuts }: Props) {
  return (
    <div className="shortcut-bar">
      {shortcuts.map((s) => (
        <div key={s.label} className="shortcut-item">
          <kbd className="key-cap">{s.keys}</kbd>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
