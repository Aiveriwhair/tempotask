import { addDays, format, startOfWeek, subDays } from "date-fns";

interface Props {
  data: Record<string, number>;
  weeks?: number;
  onDayClick?: (dateKey: string) => void;
}

function levelFor(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 150) return 3;
  return 4;
}

// Derived from the accent so the scale reads in both light and dark mode.
const LEVEL_COLORS = [
  "color-mix(in srgb, var(--text) 7%, transparent)",
  "color-mix(in srgb, var(--accent) 30%, transparent)",
  "color-mix(in srgb, var(--accent) 55%, transparent)",
  "color-mix(in srgb, var(--accent) 80%, transparent)",
  "var(--accent)",
];

export default function Heatmap({ data, weeks = 26, onDayClick }: Props) {
  const today = new Date();
  const gridStart = startOfWeek(subDays(today, weeks * 7 - 1), { weekStartsOn: 1 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= today) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return (
    <div>
      <div className="heatmap">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const minutes = data[key] ?? 0;
          const level = levelFor(minutes);
          return (
            <div
              key={key}
              className="heatmap-cell"
              title={`${format(day, "dd/MM/yyyy")} — ${minutes}m`}
              style={{ background: LEVEL_COLORS[level], cursor: onDayClick ? "pointer" : undefined }}
              onClick={() => onDayClick?.(key)}
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>Moins</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="heatmap-cell" style={{ background: c }} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}
