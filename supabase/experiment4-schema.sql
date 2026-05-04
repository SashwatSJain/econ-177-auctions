-- Experiment 4: Jar of Kernels (Common Value Auction)
-- One row per student. estimate + three first-price bids (2, 10, 100 bidders).

CREATE TABLE experiment4_responses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  TEXT        NOT NULL UNIQUE,
  estimate    NUMERIC     NOT NULL,
  bid_2       NUMERIC     NOT NULL,
  bid_10      NUMERIC     NOT NULL,
  bid_100     NUMERIC     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX experiment4_responses_student_id_idx ON experiment4_responses (student_id);
