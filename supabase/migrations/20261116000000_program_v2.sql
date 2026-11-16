-- Program v2: three gym days (Sunday lower, Monday upper, Tuesday resilience) and scrimmage Sundays.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
-- Old sessions keep their keys ('mon', 'tue', 'wed', 'sat' = the first version of the program),
-- so nothing already logged changes.

alter table public.workout_sessions drop constraint workout_sessions_session_key_check;
alter table public.workout_sessions
  add constraint workout_sessions_session_key_check check (
    session_key in (
      'lower', 'upper', 'resilience',  -- current program
      'mon', 'tue', 'wed', 'sat',      -- first version of the program (history only)
      'custom'
    )
  );

-- Scrimmage Sunday: the scrimmage is the jump session, so the jump block is dropped and the
-- strength work is done with one set fewer.
alter table public.workout_sessions add column scrimmage boolean not null default false;
