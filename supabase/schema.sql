-- Run this in your Supabase SQL editor

create table if not exists bids (
  id            uuid primary key default gen_random_uuid(),
  student_id    text not null,
  auction_type  text not null,
  round         integer not null check (round between 1 and 10),
  private_value numeric(6, 2) not null,
  amount        numeric(10, 2) not null,
  created_at    timestamptz default now()
);

-- Indexes for fast lookups
create index if not exists idx_bids_student_auction on bids (student_id, auction_type);
create index if not exists idx_bids_auction_type on bids (auction_type);

-- Row Level Security
alter table bids enable row level security;

-- Anyone (including unauthenticated students) can insert bids
create policy "Public insert"
  on bids for insert
  to anon
  with check (true);

-- Only authenticated users (instructors) can read bids
create policy "Auth read"
  on bids for select
  to authenticated
  using (true);
