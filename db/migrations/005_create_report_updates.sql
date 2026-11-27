-- CK001-16: every status change of a report: who made it, when and why.

CREATE TABLE report_updates (
  id         SERIAL PRIMARY KEY,
  -- Deleting a report deletes its history with it.
  report_id  INT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id),
  old_status VARCHAR(12),
  new_status VARCHAR(12) NOT NULL
             CHECK (new_status IN ('new', 'in_progress', 'resolved', 'rejected')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX report_updates_report_id_idx ON report_updates (report_id, created_at);
