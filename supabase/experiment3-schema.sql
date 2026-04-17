-- Experiment 3: Seller reserve auction
-- Run this in the Supabase SQL editor

create table if not exists experiment3_rounds (
  id                uuid primary key default gen_random_uuid(),
  student_id        text not null,
  treatment_key     text not null,
  block_index       integer not null check (block_index between 1 and 4),
  round_in_treatment integer not null check (round_in_treatment between 1 and 20),
  global_round      integer not null check (global_round between 1 and 80),
  bidder_count      integer not null check (bidder_count in (2, 5)),
  seller_value      numeric(10, 2) not null,
  reserve_price     numeric(10, 2) not null check (reserve_price >= 0 and reserve_price <= 100),
  simulated_bids    jsonb not null,
  highest_bid       numeric(10, 2) not null,
  second_highest_bid numeric(10, 2) not null,
  sold              boolean not null,
  sale_price        numeric(10, 2),
  profit            numeric(10, 2) not null,
  created_at        timestamptz default now()
);

create unique index if not exists idx_experiment3_round_unique
  on experiment3_rounds (student_id, treatment_key, round_in_treatment);

create index if not exists idx_experiment3_student
  on experiment3_rounds (student_id);

create index if not exists idx_experiment3_treatment
  on experiment3_rounds (treatment_key);

alter table experiment3_rounds enable row level security;

create policy "Public insert experiment3"
  on experiment3_rounds for insert
  to anon
  with check (true);

create policy "Auth read experiment3"
  on experiment3_rounds for select
  to authenticated
  using (true);
