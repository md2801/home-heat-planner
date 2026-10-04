-- Apply once to a Neon Postgres database before enabling the persistence API.
CREATE TABLE IF NOT EXISTS heat_planner_journeys (
  id uuid PRIMARY KEY,
  access_token_hash char(64) NOT NULL CHECK (access_token_hash ~ '^[0-9a-f]{64}$'),
  -- json retains DTO key order: existing snapshot guards compare JSON.stringify.
  document json NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- No TTL or cache eviction: explicit journey deletion removes the complete document.
