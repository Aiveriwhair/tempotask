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

const LEVEL_COLORS = ["var(--surface-alt)", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1"];

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
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
        <span>Moins</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}
