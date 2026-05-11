-- Beta: Common-Value First-Price Auction (Oil Well)
-- Students join and receive a private signal (half_value).
-- After all bids are in, the instructor triggers pairing server-side.

CREATE TABLE IF NOT EXISTS beta_cv_auction (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT        NOT NULL DEFAULT 'default',
  student_id  TEXT        NOT NULL,
  half_value  NUMERIC     NOT NULL CHECK (half_value >= 0 AND half_value <= 3),
  bid         NUMERIC     CHECK (bid BETWEEN 0 AND 6),
  pair_id     UUID,
  role        TEXT        CHECK (role IN ('a', 'b')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  variant     TEXT        NOT NULL DEFAULT 'integer' CHECK (variant IN ('integer', 'continuous')),
  CONSTRAINT beta_cv_auction_session_student_variant_uniq UNIQUE (session_key, student_id, variant)
);

CREATE INDEX IF NOT EXISTS beta_cv_auction_session_idx ON beta_cv_auction (session_key);
CREATE INDEX IF NOT EXISTS beta_cv_auction_pair_idx    ON beta_cv_auction (pair_id) WHERE pair_id IS NOT NULL;

ALTER TABLE beta_cv_auction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert beta_cv"
  ON beta_cv_auction FOR INSERT TO anon WITH CHECK (true);

-- Students need to read their own row (for result polling).
-- Admin client bypasses RLS; this covers anon key requests.
CREATE POLICY "public read beta_cv"
  ON beta_cv_auction FOR SELECT TO anon USING (true);
