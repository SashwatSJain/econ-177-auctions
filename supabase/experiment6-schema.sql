-- Experiment 6: All-Pay Auction of a $100 Bill
-- All bidders pay their bid; highest bidder also receives $100.
-- Instructor triggers grouping after bids are collected.

CREATE TABLE IF NOT EXISTS exp6_allpay (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT        NOT NULL DEFAULT 'default',
  student_id  TEXT        NOT NULL,
  num_bidders INTEGER     NOT NULL CHECK (num_bidders IN (2, 5, 10)),
  bid         NUMERIC,
  group_id    UUID,
  role        INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exp6_allpay_session_student_uniq UNIQUE (session_key, student_id, num_bidders)
);

CREATE INDEX IF NOT EXISTS exp6_allpay_session_idx ON exp6_allpay (session_key);
CREATE INDEX IF NOT EXISTS exp6_allpay_group_idx   ON exp6_allpay (group_id) WHERE group_id IS NOT NULL;

ALTER TABLE exp6_allpay ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert exp6"
  ON exp6_allpay FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public read exp6"
  ON exp6_allpay FOR SELECT TO anon USING (true);
