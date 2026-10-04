CREATE TABLE IF NOT EXISTS heat_planner_reward_wallets (
  user_id text PRIMARY KEY, balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS heat_planner_reward_attempts (
  id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES heat_planner_reward_wallets(user_id),
  task_id text NOT NULL, title text NOT NULL, coins integer NOT NULL CHECK (coins > 0 AND coins <= 500),
  status text NOT NULL CHECK (status IN ('checking', 'approved', 'needs-evidence', 'unavailable')),
  reason text CHECK (reason IN ('visible-action', 'unclear', 'wrong-task', 'before-after', 'not-photo', 'safety', 'service-unavailable')),
  proof_hashes jsonb NOT NULL CHECK (jsonb_typeof(proof_hashes) = 'array' AND jsonb_array_length(proof_hashes) BETWEEN 1 AND 2),
  catalogue_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), assessed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS reward_task_once ON heat_planner_reward_attempts(user_id, task_id) WHERE status IN ('checking', 'approved');
CREATE INDEX IF NOT EXISTS reward_attempt_owner ON heat_planner_reward_attempts(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS heat_planner_reward_coupons (
  id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES heat_planner_reward_wallets(user_id),
  reward_id text NOT NULL, code text NOT NULL UNIQUE CHECK (code LIKE 'HHP-DEMO-%'),
  coins integer NOT NULL CHECK (coins > 0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, reward_id)
);
CREATE TABLE IF NOT EXISTS heat_planner_reward_ledger (
  id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES heat_planner_reward_wallets(user_id),
  delta integer NOT NULL CHECK (delta <> 0), kind text NOT NULL CHECK (kind IN ('award', 'redemption')),
  reference_id uuid NOT NULL, title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind, reference_id)
);
CREATE INDEX IF NOT EXISTS reward_ledger_owner ON heat_planner_reward_ledger(user_id, created_at DESC);

-- All balance mutations lock the same wallet; concurrent claims/redemptions cannot overspend.
CREATE OR REPLACE FUNCTION heat_planner_begin_reward(p_user text, p_id uuid, p_task text, p_title text, p_coins integer, p_hashes jsonb, p_version text)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO heat_planner_reward_wallets(user_id) VALUES(p_user) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM heat_planner_reward_wallets WHERE user_id = p_user FOR UPDATE;
  UPDATE heat_planner_reward_attempts SET status = 'unavailable', reason = 'service-unavailable', assessed_at = now()
    WHERE user_id = p_user AND status = 'checking' AND created_at < now() - interval '2 minutes';
  IF EXISTS(SELECT 1 FROM heat_planner_reward_attempts WHERE user_id = p_user AND task_id = p_task AND status IN ('checking', 'approved')) THEN RETURN 'already-claimed'; END IF;
  IF (SELECT count(*) FROM heat_planner_reward_attempts WHERE user_id = p_user AND created_at > now() - interval '1 day') >= 12 THEN RETURN 'limit'; END IF;
  IF EXISTS(SELECT 1 FROM heat_planner_reward_attempts a WHERE a.user_id = p_user AND a.status IN ('checking', 'approved') AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(a.proof_hashes) old_hash JOIN jsonb_array_elements_text(p_hashes) new_hash ON old_hash.value = new_hash.value)) THEN RETURN 'duplicate-proof'; END IF;
  INSERT INTO heat_planner_reward_attempts(id, user_id, task_id, title, coins, status, proof_hashes, catalogue_version)
    VALUES(p_id, p_user, p_task, p_title, p_coins, 'checking', p_hashes, p_version);
  RETURN 'started';
END $$;

CREATE OR REPLACE FUNCTION heat_planner_redeem_reward(p_user text, p_id uuid, p_reward text, p_coins integer, p_code text, p_title text, p_ledger uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE available integer;
BEGIN
  INSERT INTO heat_planner_reward_wallets(user_id) VALUES(p_user) ON CONFLICT DO NOTHING;
  SELECT balance INTO available FROM heat_planner_reward_wallets WHERE user_id = p_user FOR UPDATE;
  IF EXISTS(SELECT 1 FROM heat_planner_reward_coupons WHERE user_id = p_user AND reward_id = p_reward) THEN RETURN 'existing'; END IF;
  IF p_coins IS NULL OR p_coins <= 0 THEN RAISE EXCEPTION 'Invalid redemption'; END IF;
  IF available < p_coins THEN RETURN 'insufficient'; END IF;
  INSERT INTO heat_planner_reward_coupons(id,user_id,reward_id,code,coins) VALUES(p_id,p_user,p_reward,p_code,p_coins);
  INSERT INTO heat_planner_reward_ledger(id,user_id,delta,kind,reference_id,title) VALUES(p_ledger,p_user,-p_coins,'redemption',p_id,p_title);
  UPDATE heat_planner_reward_wallets SET balance=balance-p_coins, updated_at=now() WHERE user_id=p_user;
  RETURN 'redeemed';
END $$;

CREATE OR REPLACE FUNCTION heat_planner_finish_reward(p_user text, p_id uuid, p_status text, p_reason text, p_ledger uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE attempt heat_planner_reward_attempts%ROWTYPE;
BEGIN
  IF p_status IS NULL OR p_reason IS NULL OR p_status NOT IN ('approved', 'needs-evidence', 'unavailable') THEN RAISE EXCEPTION 'Invalid assessment'; END IF;
  IF (p_status = 'approved' AND p_reason <> 'visible-action') OR (p_status = 'needs-evidence' AND p_reason NOT IN ('unclear','wrong-task','before-after','not-photo','safety')) OR (p_status = 'unavailable' AND p_reason <> 'service-unavailable') THEN RAISE EXCEPTION 'Invalid assessment reason'; END IF;
  PERFORM 1 FROM heat_planner_reward_wallets WHERE user_id = p_user FOR UPDATE;
  SELECT * INTO attempt FROM heat_planner_reward_attempts WHERE id = p_id AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'missing'; END IF;
  IF attempt.status <> 'checking' THEN RETURN attempt.status; END IF;
  IF attempt.created_at < now() - interval '2 minutes' THEN p_status := 'unavailable'; p_reason := 'service-unavailable'; END IF;
  UPDATE heat_planner_reward_attempts SET status = p_status, reason = p_reason, assessed_at = now() WHERE id = p_id;
  IF p_status = 'approved' THEN
    INSERT INTO heat_planner_reward_ledger(id,user_id,delta,kind,reference_id,title) VALUES(p_ledger,p_user,attempt.coins,'award',p_id,attempt.title);
    UPDATE heat_planner_reward_wallets SET balance = balance + attempt.coins, updated_at = now() WHERE user_id = p_user;
  END IF;
  RETURN p_status;
END $$;
