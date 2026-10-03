# TempoTask

App macOS native (Tauri + React + TypeScript) pour suivre le temps que tu passes sur tes
activités perso ou pro — jeux à finir, projets, sport, etc.

Crée une activité, lance son timer quand tu t'y mets, arrête-le (ou mets-le en pause) quand
tu t'arrêtes. Chaque session est enregistrée et reste modifiable à la main (heure de
début/fin, note) si besoin de corriger après coup.

**Fonctionnalités principales**

- Timer par activité : start / stop / pause, avec notes de session
- Calendrier des sessions, éditable manuellement, fusion de sessions
- Statistiques : temps total, séries (streaks), records, comparaison semaine/semaine,
  objectifs hebdomadaires, heatmap style GitHub
- Icône dans la barre de menu pour démarrer/arrêter un timer sans ouvrir la fenêtre
- Export CSV et sauvegarde/restauration complète en JSON
- Toutes les données restent en local, dans une base SQLite sur ta machine

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
