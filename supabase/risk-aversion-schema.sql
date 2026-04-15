-- Assignment 2: Risk Aversion Elicitation
-- Run this in the Supabase SQL editor

create table if not exists risk_aversion_responses (
  id         uuid primary key default gen_random_uuid(),
  student_id text not null,
  p_10       numeric(5,4) not null check (p_10 > 0 and p_10 <= 1),
  p_20       numeric(5,4) not null check (p_20 > 0 and p_20 <= 1),
  p_30       numeric(5,4) not null check (p_30 > 0 and p_30 <= 1),
  p_40       numeric(5,4) not null check (p_40 > 0 and p_40 <= 1),
  p_50       numeric(5,4) not null check (p_50 > 0 and p_50 <= 1),
  p_60       numeric(5,4) not null check (p_60 > 0 and p_60 <= 1),
  p_70       numeric(5,4) not null check (p_70 > 0 and p_70 <= 1),
  p_80       numeric(5,4) not null check (p_80 > 0 and p_80 <= 1),
  p_90       numeric(5,4) not null check (p_90 > 0 and p_90 <= 1),
  created_at timestamptz default now()
);

create unique index if not exists idx_risk_aversion_student
  on risk_aversion_responses (student_id);

alter table risk_aversion_responses enable row level security;

create policy "Public insert"
  on risk_aversion_responses for insert to anon with check (true);

create policy "Public read"
  on risk_aversion_responses for select to anon using (true);
