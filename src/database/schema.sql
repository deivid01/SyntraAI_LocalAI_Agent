-- JarvisLocalAI Database Schema

CREATE TABLE IF NOT EXISTS interactions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  input     TEXT    NOT NULL,
  intent    TEXT    NOT NULL,
  response  TEXT,
  params    TEXT,
  success   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS commands (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  command   TEXT    NOT NULL,
  params    TEXT,
  output    TEXT,
  success   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp DESC);
