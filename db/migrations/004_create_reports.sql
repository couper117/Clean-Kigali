-- CK001-16: sanitation problems reported by residents.

CREATE TABLE reports (
  id               SERIAL PRIMARY KEY,
  -- Code the resident keeps to follow the report, like CK-7F3K2A.
  reference        VARCHAR(12) NOT NULL,
  title            VARCHAR(120) NOT NULL,
  description      TEXT NOT NULL,
  category_id      INT NOT NULL REFERENCES categories(id),
  sector_id        INT NOT NULL REFERENCES sectors(id),
  location_details VARCHAR(255),
  latitude         NUMERIC(9, 6) CHECK (latitude BETWEEN -90 AND 90),
  longitude        NUMERIC(9, 6) CHECK (longitude BETWEEN -180 AND 180),
  status           VARCHAR(12) NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'in_progress', 'resolved', 'rejected')),
  priority         VARCHAR(6) NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  reporter_name    VARCHAR(100),
  reporter_phone   VARCHAR(20),
  -- If the officer's account is deleted, the report stays and is unassigned.
  assigned_to      INT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  -- The code retries on a clash of this constraint, so keep "reference" in its name.
  CONSTRAINT reports_reference_key UNIQUE (reference)
);

-- The filters staff use most on GET /api/reports, and the newest-first order.
CREATE INDEX reports_status_idx ON reports (status);
CREATE INDEX reports_category_id_idx ON reports (category_id);
CREATE INDEX reports_sector_id_idx ON reports (sector_id);
CREATE INDEX reports_assigned_to_idx ON reports (assigned_to);
CREATE INDEX reports_created_at_idx ON reports (created_at DESC, id DESC);
