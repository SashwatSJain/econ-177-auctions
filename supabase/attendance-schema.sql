CREATE TABLE attendance_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   TEXT NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  accuracy     DOUBLE PRECISION,
  code_word    TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One submission per student per Pacific-time calendar day
CREATE UNIQUE INDEX idx_attendance_student_day
  ON attendance_records (student_id, DATE(submitted_at AT TIME ZONE 'America/Los_Angeles'));

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert" ON attendance_records FOR INSERT WITH CHECK (true);
-- SELECT blocked for anon; service-role key bypasses RLS
CREATE POLICY "admin read" ON attendance_records FOR SELECT USING (false);
