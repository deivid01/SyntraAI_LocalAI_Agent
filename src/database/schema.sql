-- SyntraLocalAI Database Schema

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

CREATE TABLE IF NOT EXISTS sequences (
  name       TEXT PRIMARY KEY,
  steps      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Synapse Access & RAG System
CREATE TABLE IF NOT EXISTS synapse_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS synapse_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS synapse_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_json TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES synapse_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS synapse_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_synapse_chunks_file_id ON synapse_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_synapse_logs_created_at ON synapse_logs(created_at DESC);
