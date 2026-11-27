-- CK001-15: staff accounts. Residents do not log in, so they are not users.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  -- bcrypt hash; the password itself is never stored.
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'officer')),
  -- The sector an officer covers. Admins work city-wide and may leave it empty.
  sector_id     INT REFERENCES sectors(id),
  -- Deactivated accounts cannot log in but keep their place in report history.
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login looks up lower(email), and this index makes emails unique ignoring case.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
