-- Workouts: logged gym sessions and the sets done in them.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
--
-- The training program itself (exercises, sets x reps per phase) is not stored here: it lives in
-- src/lib/program.ts. These tables only hold what you actually did, referring to exercises by id.

-- ---------- program settings (one row per user) ----------

create table public.program_settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Monday of program week 1, as a local calendar date.
  start_date date not null,
  updated_at timestamptz not null default now()
);

-- ---------- sessions ----------
-- One row per gym session. `session_key` is the program day ('mon', 'tue', 'wed', 'sat'),
-- `date` is the local calendar day it was done (it may differ from the planned weekday).

create table public.workout_sessions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date                   date not null,
  session_key            text not null check (session_key in ('mon', 'tue', 'wed', 'sat')),
  -- The knee rule: right knee 0-10 during the session, and again the next morning.
  knee_pain              smallint check (knee_pain between 0 and 10),
  knee_pain_next_morning smallint check (knee_pain_next_morning between 0 and 10),
  notes                  text check (char_length(notes) <= 2000),
  created_at             timestamptz not null default now(),
  constraint workout_sessions_one_per_day unique (user_id, date, session_key)
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, date);

-- ---------- sets ----------
-- One row per set actually done (like habit completions: records, never counters).
-- Only the columns that apply to the exercise are filled in.

create table public.workout_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id  uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 60),
  set_number  smallint not null check (set_number between 1 and 50),
  side        text check (side in ('left', 'right')),
  reps        smallint check (reps between 0 and 1000),
  weight_kg   numeric(5, 1) check (weight_kg between 0 and 999),
  duration_s  smallint check (duration_s between 0 and 3600),
  length_cm   numeric(5, 1) check (length_cm between 0 and 999),
  pain        smallint check (pain between 0 and 10),
  created_at  timestamptz not null default now()
);

create index workout_sets_session_idx on public.workout_sets (session_id);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id);

-- ---------- access ----------

grant select, insert, update, delete
  on public.program_settings, public.workout_sessions, public.workout_sets
  to authenticated;

alter table public.program_settings enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

create policy "Users manage their own program settings"
  on public.program_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own workout sessions"
  on public.workout_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own workout sets"
  on public.workout_sets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    -- and the session must be one of theirs too
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );

-- ---------- realtime ----------

alter publication supabase_realtime add table public.program_settings, public.workout_sessions, public.workout_sets;
