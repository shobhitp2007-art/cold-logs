-- Cold Logs admin access migration.
-- Run in Supabase Dashboard > SQL Editor as project owner.
-- Keep the existing participant INSERT policy. This adds an admin-only SELECT path.
-- Do not put a service_role key in browser code.

create table if not exists public.cold_logs_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.cold_logs_admins enable row level security;

-- Admins may check their own membership row; they cannot grant themselves access.
drop policy if exists "Admins can read own admin membership" on public.cold_logs_admins;
create policy "Admins can read own admin membership"
on public.cold_logs_admins
for select
to authenticated
using (auth.uid() = user_id);

-- SECURITY DEFINER is used so the membership check can read the admin table
-- without depending on the caller's RLS visibility. Pin search_path.
create or replace function public.cold_logs_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cold_logs_admins a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.cold_logs_is_admin() from public;
grant execute on function public.cold_logs_is_admin() to authenticated;

-- Add admin read access to submissions without removing team-owned access.
alter table public.case_submissions enable row level security;
drop policy if exists "Cold Logs admins read all submissions" on public.case_submissions;
create policy "Cold Logs admins read all submissions"
on public.case_submissions
for select
to authenticated
using ((select public.cold_logs_is_admin()));

-- Optional: make sure the browser roles do not get write access to the admin roster.
revoke insert, update, delete, truncate, references, trigger
on public.cold_logs_admins from anon, authenticated;

-- IMPORTANT: create the organizer account in Supabase Auth first, then insert its UUID below.
-- Replace the UUID with the organizer auth.users.id; never use a team account.
-- insert into public.cold_logs_admins (user_id)
-- values ('REPLACE-WITH-ORGANIZER-AUTH-USER-UUID');

-- Existing case_submissions SELECT policy should remain:
-- using (auth.uid() = user_id)
-- Existing "Teams submit their own case work" INSERT policy should remain unchanged.
