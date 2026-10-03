# TempoTask

App macOS (Tauri + React + TypeScript) pour suivre le temps passé sur tes activités : timer
par activité (start/stop/pause), calendrier des sessions, statistiques et export CSV/JSON.
Toutes les données sont stockées localement dans une base SQLite.

## Prérequis

- [Node.js](https://nodejs.org/) (18+)
- [Rust](https://www.rust-lang.org/tools/install)

## Développement

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

L'app empaquetée (`.app`/`.dmg`) est générée dans `src-tauri/target/release/bundle/`.
