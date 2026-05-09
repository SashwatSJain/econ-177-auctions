CREATE TABLE attendance_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   TEXT NOT NULL,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  accuracy     DOUBLE PRECISION,
  code_word    TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One submission per student per code word
CREATE UNIQUE INDEX idx_attendance_student_code
  ON attendance_records (student_id, code_word);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert" ON attendance_records FOR INSERT WITH CHECK (true);
-- SELECT blocked for anon; service-role key bypasses RLS
CREATE POLICY "admin read" ON attendance_records FOR SELECT USING (false);
