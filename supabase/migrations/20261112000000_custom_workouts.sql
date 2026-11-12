-- Custom workouts and your own exercises.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
-- Safe to run after 20261111000000_init.sql and 20261111010000_workouts.sql.

-- ---------- sessions: allow a 'custom' session on any day ----------

alter table public.workout_sessions drop constraint workout_sessions_session_key_check;
alter table public.workout_sessions
  add constraint workout_sessions_session_key_check check (session_key in ('mon', 'tue', 'wed', 'sat', 'custom'));

-- Exercises added by hand to a session (to a custom workout, or on top of a program day), in the
-- order they were added. Program exercises by their id in src/lib/program.ts, your own exercises
-- as 'custom-<uuid>'.
alter table public.workout_sessions
  add column extra_exercise_ids text[] not null default '{}'
  constraint workout_sessions_extra_exercises_check check (cardinality(extra_exercise_ids) <= 50);

-- ---------- your own exercises ----------

create table public.custom_exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  -- What is logged for each set, same meaning as in the program: kg, reps, sec, cm, pain.
  -- Empty = the set is just ticked off as done.
  fields     text[] not null default '{}' check (fields <@ array['kg', 'reps', 'sec', 'cm', 'pain']::text[]),
  per_side   boolean not null default false,
  created_at timestamptz not null default now()
);

-- No two of your exercises with the same name (ignoring case).
create unique index custom_exercises_user_name_key on public.custom_exercises (user_id, lower(btrim(name)));

grant select, insert, update, delete on public.custom_exercises to authenticated;

alter table public.custom_exercises enable row level security;

create policy "Users manage their own exercises"
  on public.custom_exercises for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter publication supabase_realtime add table public.custom_exercises;
