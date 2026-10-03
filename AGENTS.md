# TempoTask — contexte pour reprise de session

App macOS (Tauri 2 + React + TypeScript + Vite) de suivi de temps par activité :
timer start/stop/pause, calendrier de sessions, stats, tray menu bar, SQLite locale
(via `tauri-plugin-sql`). Voir [README.md](README.md) pour l'install/dev/build.

## Architecture rapide

- `src/pages/` : ActivitiesPage, CalendarPage, StatsPage, SettingsPage
- `src/components/` : ActivityCard, IconButton, ShortcutBar, FocusMode, ConfirmDialog,
  ActivityFormModal, SessionEditorModal, Heatmap
- `src/lib/` : accès DB (`activities.ts`, `sessions.ts`, `categories.ts`, `backup.ts`,
  `csv.ts`), `stats.ts` (calculs), `TimerContext.tsx` (état global timer + tray sync),
  `format.ts` (formatage durées)
- `src-tauri/src/lib.rs` : tray icon + menu dynamique, migrations SQL
- `src-tauri/migrations/*.sql` : migrations checksummées par `tauri-plugin-sql`

## Pièges connus

- **Ne jamais modifier un fichier de migration déjà appliqué** (même juste le
  formatage) : le checksum change et l'app plante au démarrage avec
  "migration N was previously applied but has been modified". Toujours ajouter une
  nouvelle migration numérotée. DB de dev (macOS) :
  `~/Library/Application Support/com.williamisabelle.tempotask/tempotask.db`
  (supprimer pour reset si besoin).
- `.vscode/settings.json` désactive le format-on-save pour les `.sql` (évite de
  recasser les migrations).
- Pour QA visuelle rapide sans relancer toute l'app Tauri : `npm run dev` (Vite seul)
  puis ouvrir `http://localhost:1420/` dans un navigateur. Les appels DB/Tauri
  échouent silencieusement hors contexte Tauri (`TimerContext.refresh()` a un
  try/catch pour ça), donc les pages s'affichent quand même mais sans données réelles.
  Pour tester avec de vraies données : `npm run tauri dev`.
- Binaire Rust nommé explicitement `TempoTask` via `[[bin]]` dans `Cargo.toml` (sinon
  macOS affiche `tauri-app` au survol en mode dev).

## Dernière tâche en cours : refonte visuelle

Demande : l'écran Activités était moche et s'affichait mal en fenêtre non-fullscreen ;
refonte demandée de tout le front pour un rendu moderne, clair, et responsive à
l'échelle desktop.

Fait :

- Remplacement de tous les emojis par des icônes `lucide-react` (sauf le menu natif
  macOS dans `lib.rs`, où des caractères unicode restent standards)
- Nouveau design system dans `src/App.css` (tokens couleurs/ombres/radius, dark mode,
  cartes, boutons, modales, calendrier, stats)
- `ActivityCard` repensée (timer centré en grand, actions pleine largeur)
- Sidebar avec icônes de nav + état actif plus lisible
- Taille mini de fenêtre augmentée dans `tauri.conf.json`
  (`minWidth: 1020, minHeight: 700`) pour éviter l'affichage cassé en petite fenêtre
- Correctif : le bouton supprimer activité ne marchait pas (`window.confirm()` ne
  fonctionne pas fiablement dans la webview Tauri) → remplacé par `ConfirmDialog`
- Ajout vue "activités archivées" (afficher/restaurer/supprimer)
- Focus mode : barre de raccourcis clavier (Espace = démarrer/pause/reprendre, ⇧S = arrêter, Esc = fermer)
- Tray : Démarrer / Pause / Reprendre + Arrêter séparé pour une activité en cours
- QA visuelle (Vite + Brave headless à 1020×700, IPC Tauri mocké avec des fausses
  données) de toutes les pages, clair + sombre. Corrigé suite à la QA :
  - Calendrier : colonnes qui s'écrasaient avec des puces de session
    (`repeat(7, minmax(0, 1fr))`)
  - ActivityCard : icônes sur leur propre ligne, nom pleine largeur (avant, le nom
    était coupé lettre par lettre)
  - Stats : barres du graphique invisibles (animation Recharts relancée à chaque tick
    de `now`) → `isAnimationActive={false}` ; axe Y en heures ; tuiles 4 par ligne ;
    heatmap aux couleurs dérivées de `--accent` (lisible en dark mode)

Reste à faire :

- Tester en conditions réelles via `npm run tauri dev` (créer une activité, lancer
  un timer, redimensionner près du minimum) — non fait, nécessite l'app native
