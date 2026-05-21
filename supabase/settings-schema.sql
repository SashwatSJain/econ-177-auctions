-- app_settings: single-row configuration table (id = 1)
-- Run this in your Supabase SQL editor to create or update the settings table.

create table if not exists app_settings (
  id             integer primary key default 1,
  location_mode  text not null default 'optional' check (location_mode in ('off', 'optional', 'required')),
  class_schedule jsonb default null,
  constraint single_row check (id = 1)
);

-- Ensure exactly one row exists
insert into app_settings (id) values (1) on conflict do nothing;

alter table app_settings enable row level security;

create policy "Auth read"
  on app_settings for select
  to authenticated
  using (true);

create policy "Auth update"
  on app_settings for update
  to authenticated
  using (true);

-- If the table already exists without class_schedule, run just this:
alter table app_settings add column if not exists class_schedule jsonb default null;
