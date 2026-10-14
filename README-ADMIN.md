# Cold Logs Admin Console

This is an add-on for the existing static HTML/CSS/JavaScript + Supabase project. It does not replace `index.html`, `script.js`, `dashboard.html`, `dashboard.js`, or `case.js`.

## Files to add

- `admin-login.html` — separate organizer login page
- `admin-login.js` — Supabase password sign-in and membership check
- `admin.html` — dashboard UI
- `admin.js` — admin authorization, data queries, team summaries, submissions, monitoring, and CSV export
- `admin.css` — responsive black/yellow theme
- `supabase-admin.sql` — database-side admin authorization
- `README-ADMIN.md` — this guide

## 1. Add files to the repository

Copy the six application/migration files into the repository root alongside `index.html` and `supabase-config.js`. Do not overwrite the participant pages or their JavaScript.

## 2. Run the SQL migration

In Supabase Dashboard → SQL Editor, run `supabase-admin.sql`.

The migration creates `public.cold_logs_admins`, adds `public.cold_logs_is_admin()`, and adds an admin-only SELECT policy for `public.case_submissions`. It intentionally does not grant browser-side insert/update/delete access to submissions or admin membership.

## 3. Create the organizer account

1. In Supabase Dashboard → Authentication → Users, create an organizer user with an email and a strong unique password.
2. Copy that user's UUID.
3. In SQL Editor, run the following after replacing the UUID:

```sql
insert into public.cold_logs_admins (user_id)
values ('REPLACE-WITH-ORGANIZER-AUTH-USER-UUID');
```

Do not add a team user to this table. The organizer account is separate from participant accounts. Keep admin account provisioning restricted to project owners.

## 4. Deploy

Commit and push the new files. Vercel should deploy them with the existing static site. Open `/admin-login.html` to sign in. Team login remains at `/` or `/index.html`.

The existing `supabase-config.js` must load the Supabase JS v2 CDN before it runs and should contain only the publishable/anon key. Never add a `service_role` key to client-side JavaScript.

## What the dashboard can and cannot see

The current schema has `case_submissions` but does not expose a team roster table to browser clients. Therefore the Teams tab shows distinct team IDs found in submissions; it cannot list teams that have never submitted or manage Auth users. Account creation, password resets, disable/enable controls, and full registered-team inventory should be implemented via a trusted server-side function (for example a Supabase Edge Function) after the team provisioning process is defined.

The Monitoring tab displays the `anti_cheat_events` JSON saved with submissions. These events are client-reported signals, not definitive proof of misconduct. Events are only as current as the last saved submission unless the app separately persists events in real time.

## Important schema check

The current SQL migration expects `case_submissions` to include:
`id, user_id, team_id, case_id, answers, anti_cheat_events, anti_cheat_count, submission_status, submission_reason, started_at, submitted_at, created_at, elapsed_seconds, evidence_files_available`.

If your live Supabase table differs, reconcile the schema before deploying. Keep the existing participant insert policy and verify team accounts can still submit/read their own work after applying the migration.

## Test checklist

1. Open `admin-login.html` while signed out. `admin.html` should redirect to the admin login.
2. Sign in using a team account that is not in `cold_logs_admins`. It must be signed out and denied.
3. Sign in using the organizer account. The admin console should load.
4. Check counts and tables against known rows in Supabase `case_submissions`.
5. Search team IDs, filter statuses, open submission details, and test each CSV export.
6. Confirm exported CSV cells beginning with `=`, `+`, `-`, or `@` are escaped.
7. Sign out and verify admin pages cannot load data without a session.
8. In a separate browser session, verify a participant can still sign in, open the case desk, and submit work.
9. Using a participant session, try querying another team's submission directly through Supabase; RLS should deny access.
10. Check browser console and Supabase logs for permission errors.

## Known scope limits

- Data query is capped at 5,000 most recent submissions. For larger events, use server-side pagination.
- “Teams” means teams with at least one submission until a trusted roster table is added.
- Monitoring is based on persisted `anti_cheat_events`; it is not live telemetry by itself.
- CSV export contains answer and monitoring JSON, so treat exports as sensitive event records.
