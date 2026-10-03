import { useRef, useState } from "react";
import { exportSessionsCsv } from "../lib/csv";
import { exportAllDataJson, importAllDataJson } from "../lib/backup";
import { useTimer } from "../lib/TimerContext";

export default function SettingsPage() {
  const { refresh } = useTimer();
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    try {
      await exportSessionsCsv();
    } finally {
      setExporting(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      await exportAllDataJson();
    } finally {
      setBackingUp(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const result = await importAllDataJson(file);
      setImportMessage(
        `Import terminé : ${result.activities} activité(s), ${result.sessions} session(s).`
      );
      await refresh();
    } catch (err) {
      setImportMessage(`Erreur : ${(err as Error).message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Réglages</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 13.5 }}>Export</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Exporte toutes tes sessions au format CSV pour les analyser ailleurs.
        </p>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Export en cours…" : "Exporter en CSV"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 13.5 }}>Sauvegarde complète</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Exporte toutes tes données (catégories, activités, sessions) dans un fichier JSON, utile
          avant une mise à jour ou pour transférer tes données sur un autre Mac.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? "Export en cours…" : "Exporter toutes les données (JSON)"}
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? "Import en cours…" : "Importer un fichier JSON"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
        {importMessage && (
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 0 }}>{importMessage}</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, fontSize: 13.5 }}>À propos</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          TempoTask stocke toutes tes données localement dans une base SQLite, sur ta machine
          uniquement. Un clic sur l'icône dans la barre de menu permet de démarrer/arrêter
          rapidement le timer d'une activité sans ouvrir la fenêtre principale.
        </p>
      </div>
    </div>
  );
}
