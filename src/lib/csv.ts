import { listAllSessions } from "./sessions";
import { sessionMinutes } from "./stats";

export async function exportSessionsCsv(): Promise<void> {
  const sessions = await listAllSessions();
  const header = ["Activité", "Début", "Fin", "Durée (minutes)", "Note"];
  const rows = sessions.map((s) => [
    s.activity_name,
    s.start_time,
    s.end_time ?? "",
    String(sessionMinutes(s)),
    (s.note ?? "").replace(/\n/g, " "),
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tempotask-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
