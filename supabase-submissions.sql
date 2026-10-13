-- Run this once in Supabase Dashboard > SQL Editor.
-- Stores structured team answers and anti-cheat/focus event logs.
-- Correct answers are intentionally NOT stored in the public browser app.

create table if not exists public.case_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null,
  case_id text not null,
  answers jsonb not null default '[]'::jsonb,
  anti_cheat_events jsonb not null default '[]'::jsonb,
  anti_cheat_count integer not null default 0 check (anti_cheat_count >= 0),
  submission_status text not null default 'submitted',
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);


-- Backwards-compatible fields for the HS26-IR-014 investigation flow.
-- These ALTERs are safe to re-run if the base table already exists.
alter table public.case_submissions
  add column if not exists submission_reason text not null default 'submitted';
alter table public.case_submissions
  add column if not exists elapsed_seconds integer not null default 0;
alter table public.case_submissions
  add column if not exists evidence_files_available jsonb not null default '[]'::jsonb;

create index if not exists case_submissions_case_submitted_idx
  on public.case_submissions (case_id, submitted_at desc);
create index if not exists case_submissions_team_idx
  on public.case_submissions (team_id, submitted_at desc);

alter table public.case_submissions enable row level security;

-- A team can submit only under its own authenticated account and matching email ID.
drop policy if exists "Teams submit their own case work" on public.case_submissions;
create policy "Teams submit their own case work"
  on public.case_submissions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and team_id = upper(split_part(auth.jwt() ->> 'email', '@', 1))
  );

-- Teams can only read their own submissions. Organizers can review all rows in the Supabase dashboard.
drop policy if exists "Teams read their own submissions" on public.case_submissions;
create policy "Teams read their own submissions"
  on public.case_submissions
  for select to authenticated
  using (auth.uid() = user_id);

-- No browser update/delete policy is provided intentionally.
