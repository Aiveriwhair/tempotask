CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  goal_minutes_per_week INTEGER,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);

INSERT INTO categories (name, color)
SELECT 'Jeux', '#8b5cf6'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Jeux');

INSERT INTO categories (name, color)
SELECT 'Travail', '#0ea5e9'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Travail');

INSERT INTO categories (name, color)
SELECT 'Perso', '#22c55e'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Perso');
