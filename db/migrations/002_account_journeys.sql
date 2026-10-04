-- Identity is provided by Neon Auth; clients never choose this owner ID.
-- json preserves the existing immutable snapshots' property order.
CREATE TABLE IF NOT EXISTS heat_planner_account_journeys (
  user_id text PRIMARY KEY,
  draft json NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
