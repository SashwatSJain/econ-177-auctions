-- Quarter System Fixes
-- Applied directly to the live project via Supabase MCP on 2026-08-20.
-- Kept here for schema history / local dev parity — running it again is a no-op
-- error on a DB that already has these constraints (drop targets a specific name).

-- ─── 1. Scope per-student unique constraints by quarter_id ────────────────────
-- Previously these were unique per student_id alone (or per session+student+variant
-- with no quarter), so a student_id reused in a later quarter (retake, TA test data,
-- etc.) would hit a raw DB unique-violation on insert instead of a clean "already
-- submitted" response.

alter table experiment4_responses drop constraint experiment4_responses_student_id_key;
alter table experiment4_responses add constraint experiment4_responses_student_id_quarter_uniq unique (student_id, quarter_id);

alter table beta_cv_auction drop constraint beta_cv_auction_session_student_variant_uniq;
alter table beta_cv_auction add constraint beta_cv_auction_session_student_variant_uniq unique (session_key, student_id, variant, quarter_id);

alter table exp6_allpay drop constraint exp6_allpay_session_student_uniq;
alter table exp6_allpay add constraint exp6_allpay_session_student_uniq unique (session_key, student_id, num_bidders, quarter_id);

-- ─── 2. Atomic quarter creation ────────────────────────────────────────────────
-- POST /api/admin/quarters previously did "deactivate current, then insert new" as
-- two separate requests. A crash/error between them could leave zero active
-- quarters, which makes every student write path 500 until manually fixed. A
-- plpgsql function body is one transaction, so this can no longer happen.

create or replace function create_quarter(p_name text, p_class_schedule jsonb)
returns quarters
language plpgsql
as $$
declare
  new_quarter quarters;
begin
  update quarters set is_active = false where is_active;
  insert into quarters (name, is_active, class_schedule)
  values (p_name, true, p_class_schedule)
  returning * into new_quarter;
  return new_quarter;
end;
$$;
