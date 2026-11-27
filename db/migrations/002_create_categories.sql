-- CK001-15: the kinds of problem a resident can report (illegal dumping, full bin, ...).

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(60) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique ignoring case, so "Blocked drain" and "blocked drain" cannot both exist.
CREATE UNIQUE INDEX categories_name_key ON categories (lower(name));
