-- Quarter Archive Migration
-- Run this in your Supabase SQL editor in order, top to bottom.

-- ─── 1. Create quarters table ─────────────────────────────────────────────────

create table if not exists quarters (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  is_active      boolean not null default false,
  class_schedule jsonb default null,
  created_at     timestamptz not null default now()
);

-- At most one active quarter at a time
create unique index if not exists quarters_one_active on quarters (is_active) where is_active;

alter table quarters enable row level security;

create policy "Auth read"   on quarters for select to authenticated using (true);
create policy "Auth update" on quarters for update to authenticated using (true);
create policy "Auth insert" on quarters for insert to authenticated with check (true);

-- ─── 2. Seed Spring 2026 (copy existing class_schedule from app_settings) ──────

insert into quarters (name, is_active, class_schedule)
select 'Spring 2026', true, class_schedule
from app_settings
where id = 1;

-- ─── 3. Add quarter_id to all 7 data tables ───────────────────────────────────

alter table bids                    add column if not exists quarter_id uuid references quarters(id);
alter table risk_aversion_responses add column if not exists quarter_id uuid references quarters(id);
alter table experiment3_rounds      add column if not exists quarter_id uuid references quarters(id);
alter table experiment4_responses   add column if not exists quarter_id uuid references quarters(id);
alter table beta_cv_auction         add column if not exists quarter_id uuid references quarters(id);
alter table exp6_allpay             add column if not exists quarter_id uuid references quarters(id);
alter table attendance_records      add column if not exists quarter_id uuid references quarters(id);

-- ─── 4. Backfill all existing rows to Spring 2026 ─────────────────────────────

update bids                    set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;
update risk_aversion_responses set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;
update experiment3_rounds      set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;
update experiment4_responses   set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;
update beta_cv_auction         set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;
update exp6_allpay             set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;
update attendance_records      set quarter_id = (select id from quarters where is_active limit 1) where quarter_id is null;

-- ─── 5. Trigger: auto-stamp quarter_id on every insert ────────────────────────

create or replace function stamp_quarter_id()
returns trigger language plpgsql as $$
begin
  if new.quarter_id is null then
    new.quarter_id := (select id from quarters where is_active limit 1);
  end if;
  return new;
end;
$$;

create trigger bids_stamp_quarter
  before insert on bids
  for each row execute function stamp_quarter_id();

create trigger risk_aversion_stamp_quarter
  before insert on risk_aversion_responses
  for each row execute function stamp_quarter_id();

create trigger experiment3_stamp_quarter
  before insert on experiment3_rounds
  for each row execute function stamp_quarter_id();

create trigger experiment4_stamp_quarter
  before insert on experiment4_responses
  for each row execute function stamp_quarter_id();

create trigger beta_cv_stamp_quarter
  before insert on beta_cv_auction
  for each row execute function stamp_quarter_id();

create trigger exp6_stamp_quarter
  before insert on exp6_allpay
  for each row execute function stamp_quarter_id();

create trigger attendance_stamp_quarter
  before insert on attendance_records
  for each row execute function stamp_quarter_id();

-- ─── 6. Rebuild views to pass through quarter_id ──────────────────────────────
-- NOTE: If your existing views have custom logic (e.g. different timezone handling),
-- run `select pg_get_viewdef('v_bids_student_days', true);` first to compare.

create or replace view v_bids_student_days as
select student_id,
    quarter_id,
    (created_at at time zone 'America/Los_Angeles'::text)::date as date_la
   from bids
  group by student_id, quarter_id, ((created_at at time zone 'America/Los_Angeles'::text)::date);

create or replace view v_bids_student_day_first as
select student_id,
    quarter_id,
    (created_at at time zone 'America/Los_Angeles'::text)::date as date_la,
    min(created_at) as first_at
   from bids
  group by student_id, quarter_id, ((created_at at time zone 'America/Los_Angeles'::text)::date);

create or replace view v_exp3_student_days as
select student_id,
    quarter_id,
    (created_at at time zone 'America/Los_Angeles'::text)::date as date_la
   from experiment3_rounds
  group by student_id, quarter_id, ((created_at at time zone 'America/Los_Angeles'::text)::date);

create or replace view v_exp3_student_day_first as
select student_id,
    quarter_id,
    (created_at at time zone 'America/Los_Angeles'::text)::date as date_la,
    min(created_at) as first_at
   from experiment3_rounds
  group by student_id, quarter_id, ((created_at at time zone 'America/Los_Angeles'::text)::date);
