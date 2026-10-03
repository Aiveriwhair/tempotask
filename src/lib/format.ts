export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export function formatSeconds(totalSeconds: number): string {
  let seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  seconds -= h * 3600;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function computeElapsedSeconds(
  startIso: string,
  pausedAt: string | null,
  pausedDurationSeconds: number,
  now: Date,
): number {
  const start = new Date(startIso);
  const end = pausedAt ? new Date(pausedAt) : now;
  const rawSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  return Math.max(0, rawSeconds - pausedDurationSeconds);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function parseDateTimeLocalInput(value: string): string {
  // value is like "2026-10-03T14:30" interpreted in local time
  return new Date(value).toISOString();
}
