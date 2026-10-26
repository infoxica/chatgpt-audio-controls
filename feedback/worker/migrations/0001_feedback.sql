CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source TEXT NOT NULL CHECK (source IN ('installed', 'uninstall')),
  reason TEXT NOT NULL,
  comment TEXT NOT NULL CHECK (length(comment) <= 1000),
  locale TEXT NOT NULL,
  extension_version TEXT NOT NULL,
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  form_version INTEGER NOT NULL,
  payload_hash TEXT NOT NULL
);
CREATE INDEX feedback_received_at ON feedback(received_at);
CREATE INDEX feedback_source_reason ON feedback(source, reason);
