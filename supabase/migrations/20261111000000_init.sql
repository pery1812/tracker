-- Habit tracker: initial schema.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste this file -> Run.
--
-- Every row belongs to a user (user_id defaults to the signed-in user), and Row Level Security
-- makes sure each user can only see and change their own rows.

-- ---------- habits ----------

create table public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 60),
  color          text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  frequency_type text not null check (frequency_type in ('daily', 'weekly')),
  times_per_week smallint check (times_per_week between 1 and 7),
  created_at     timestamptz not null default now(),
  constraint habits_frequency_check check (
    (frequency_type = 'daily'  and times_per_week is null) or
    (frequency_type = 'weekly' and times_per_week is not null)
  )
);

create index habits_user_id_idx on public.habits (user_id);

-- ---------- completions ----------
-- One row per tap. `date` is the user's LOCAL calendar day ("YYYY-MM-DD"), stored as a plain
-- DATE with no time zone conversion. A habit can be completed at most once per day; the unique
-- constraint also stops a double tap on two devices from creating two rows.

create table public.completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  date       date not null,
  created_at timestamptz not null default now(),
  constraint completions_habit_date_key unique (habit_id, date)
);

create index completions_user_date_idx on public.completions (user_id, date);

-- ---------- access ----------

grant select, insert, update, delete on public.habits, public.completions to authenticated;

alter table public.habits enable row level security;
alter table public.completions enable row level security;

create policy "Users manage their own habits"
  on public.habits for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own completions"
  on public.completions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    -- and the habit being completed must be one of theirs too
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

-- ---------- realtime ----------
-- Lets an open tab (e.g. your laptop) update instantly when you tap something on your phone.

alter publication supabase_realtime add table public.habits, public.completions;
