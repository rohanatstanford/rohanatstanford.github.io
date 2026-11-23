CREATE TABLE IF NOT EXISTS trips (
  trip TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS states (
  trip TEXT NOT NULL,
  device TEXT NOT NULL,
  at INTEGER NOT NULL,
  by_user TEXT,
  iv TEXT NOT NULL,
  ct TEXT NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (trip, device)
);
CREATE INDEX IF NOT EXISTS states_trip_updated ON states (trip, updated);
