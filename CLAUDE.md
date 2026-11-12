# Habit Tracker

Personal workout and habit tracker for a single user. **Phone first**, but must also look good on a laptop.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`; no `tailwind.config` file — config lives in `src/index.css`)
- React Router (`react-router-dom`) for the 4 pages
- Data + auth: **Supabase** (`@supabase/supabase-js`) — Postgres with Row Level Security, email/password
  sign-in, Realtime for live sync between phone and laptop
- Hosting: **Vercel** (`vercel.json` rewrites all paths to `index.html` for client-side routing)

## Commands

- `npm run dev` — dev server on port 5173, listening on the LAN (`server.host: true`) so a phone on the same Wi-Fi can open it
- `npm run build` — type-check and build to `dist/`
- `npm run lint` — oxlint
- `npm test` — vitest unit tests (`src/lib/*.test.ts`: dates, program schedule, streaks, set maths).
  Date logic must pass in any time zone, e.g. `TZ=Pacific/Kiritimati npm test`.

## Folder structure

```
supabase/
  migrations/           SQL schema + RLS policies; run each file once, in order, in the Supabase SQL editor
    20261111000000_init.sql      habits, completions
    20261111010000_workouts.sql  program_settings, workout_sessions, workout_sets
    20261112000000_custom_workouts.sql  'custom' sessions, extra_exercise_ids, custom_exercises
src/
  main.tsx              entry point
  App.tsx               session gate (sign-in vs app) + routes
  index.css             Tailwind import + global styles
  components/
    Layout.tsx          bottom tab bar (phone) / sidebar (md+), PageHeader, SignOutButton
    HabitForm.tsx       add/edit/delete habit sheet
    ImportLocalData.tsx one-time offer to copy pre-Supabase localStorage data to the account
    ErrorBanner.tsx     shows any failed save/load (catches unhandled promise rejections)
    KneePainPicker.tsx  0–10 buttons; values above the knee-rule limit shown amber
    ExercisePicker.tsx  sheet to search/add an exercise to a session, or create your own
    LineChart.tsx       SVG line chart over dates: crosshair tooltip, legend, reference line, table view
    HabitHeatmap.tsx    12-week Mon–Sun grid in the habit colour
    Badge.tsx           small pill (Deload, Test week)
    icons.tsx           inline SVG icons
  pages/
    SignInPage.tsx      email + password; shows setup help if env vars are missing
    TodayPage.tsx       today's habits, tap to complete, undo
    HabitsPage.tsx      list + add/edit/delete habits
    WorkoutsPage.tsx    program start date, week/phase, knee rule, today's session, this week, history
    WorkoutSessionPage.tsx  /workouts/s/:id — log sets per exercise, "last time", + Add exercise, knee pain, notes
    StatsPage.tsx       Habits tab (streaks, heatmaps) + Workouts tab (knee, progress, left/right, tests)
  hooks/
    useSession.ts       current Supabase session (undefined = loading, null = signed out)
    useHabits.ts        load + mutate habits (via storage), live-updates
    useCompletions.ts   load + mutate completions for a date range (via storage), optimistic, live-updates
    useToday.ts         today's local date key, rolls over at midnight
    useLiveQuery.ts     generic: run a storage call, reload on deps / realtime changes
    useWorkouts.ts      program settings, custom exercises, session history, one session with optimistic set logging
  lib/
    supabase.ts         the Supabase client (reads VITE_ env vars)
    storage.ts          THE ONLY place that reads/writes habit data
    auth.ts             sign in / sign out / session
    types.ts            Habit, Completion, WorkoutSession, WorkoutSet, ... (app-side camelCase types)
    dates.ts            local date-key helpers (toDateKey, weekRange, ...)
    colors.ts           habit colour palette
    program.ts          the 12-week Bulletproof Volleyball Program as data (sessions, exercises, Rx per phase, tests)
    schedule.ts         program week/phase for a date, deload/test weeks, planSession() — pure
    exercises.ts        lookup across program + your own exercises, picker groups, plannedExtra() — pure
    stats.ts            streaks, completion rates, set summaries, progress series — pure
```

## Rules

### Storage

- **All reading and saving of data goes through `src/lib/storage.ts`.** Pages, components and hooks
  must never call `supabase.from(...)` or `localStorage` directly. (Auth lives in `src/lib/auth.ts`.)
- Every storage function is `async`, returns camelCase app types, and **throws** on error. Database
  rows are snake_case; mapping happens only inside `storage.ts`.
- Errors must never fail silently: anything a page doesn't catch shows in `ErrorBanner`.
  Optimistic updates must be reverted when the save fails.
- `user_id` is never sent from the app: the database fills it with `auth.uid()` and RLS restricts
  every row to its owner.
- Deleting a habit deletes its completions via `ON DELETE CASCADE` in the database.
- Live sync: hooks call `storage.subscribeToChanges(table, reload)` (Supabase Realtime + reload when
  the tab becomes visible again).
- Schema changes go in a **new** file in `supabase/migrations/` (never edit one already applied), and
  `storage.ts` row types must be updated to match.

### Data

- **Completions are separate records** (`{ id, habitId, date, createdAt }`), one per tap — never counters.
  All progress (done today, X / Y this week, streaks, stats) is computed by counting records.
- A habit counts at most once per day (enforced by `unique (habit_id, date)`; `addCompletion` treats a
  duplicate as success, e.g. tapping on phone and laptop at once). "Undo" deletes today's record.
- **Calendar dates are local `"YYYY-MM-DD"` strings in the user's own time zone, never UTC.**
  Use `toDateKey()` / `todayKey()` / `fromDateKey()` from `src/lib/dates.ts`.
  Never use `toISOString()` or `new Date("YYYY-MM-DD")` for calendar dates (both are UTC).
  `createdAt` timestamps are instants, so ISO/UTC is fine there.
- In Supabase, `date` is a Postgres `date` column holding the local key as-is (it comes back as
  `"YYYY-MM-DD"` text, no conversion).
- Weeks start on Monday (`WEEK_STARTS_ON` in `dates.ts`).
- Habit frequency is either `{ type: 'daily' }` or `{ type: 'weekly', timesPerWeek: 1–7 }`.

### Workouts

- The training program is **static content in `src/lib/program.ts`**, not database rows. The database
  only stores what was actually done. Source: the user's "Bulletproof Volleyball Program" PDF
  (12 weeks, phases 1–4 / 5–8 / 9–12, gym Mon/Tue/Wed/Sat, deloads weeks 4 and 8, tests Wed of
  weeks 1, 4, 8, 12, knee rule 3/10). Units are **kg**.
- **Never rename an exercise `id`** — logged sets reference it. A movement that changes between phases
  (wall sit → overloaded pull, drop landing → drop jump → depth jump) is a separate exercise with its own id.
- **Sets are separate records** (`workout_sets`: one row per set done), like completions — never counters.
  Only the columns the exercise's `fields` use are filled in (`kg`→weight_kg, `reps`, `sec`→duration_s,
  `cm`→length_cm, `pain`). Per-side exercises log `side` left then right, left first.
- Program week comes from `program_settings.start_date` (Monday of week 1) via `schedule.ts`; it is
  computed, not stored on sessions, so changing the start date re-labels history.
- One session per kind per date (`unique (user_id, date, session_key)`);
  `getOrCreateWorkoutSession` reopens an existing one. Kinds: `mon`/`tue`/`wed`/`sat` (program days)
  and `custom` (any day, no plan). In app types the column is `sessionKind`; use `sessionTitle()` and
  `isProgramSession()` rather than indexing `SESSIONS` with it.
- Exercises added by hand live in `workout_sessions.extra_exercise_ids` (ordered). The session page
  also shows any exercise with logged sets that isn't planned, so a logged set is never hidden.
  An added exercise can be removed only while it has no sets.
- Your own exercises are rows in `custom_exercises` (name unique per user, ignoring case); in the app
  their id is `custom-<uuid>` (`CUSTOM_ID_PREFIX`), so they can't clash with program ids. They use the
  same `fields` / `perSide` model as program exercises.
- "Last time" = the most recent earlier session (earlier date, or earlier the same day) that logged
  that exercise, whatever kind of session it was.
- "This week x/4" counts program sessions only; custom workouts are extra.
- Deload = `round(sets × 0.6)` (min 1) and exercises with `skipOnDeload` are dropped.
- Business logic (week maths, streaks, progress) lives in pure functions in `schedule.ts` / `stats.ts`
  with unit tests; pages only render.

### UI

- Phone first: design for ~375px wide, then enhance at `md:` (768px+), where the bottom nav is replaced by a sidebar.
- Tap targets at least 44px; inputs at least 16px font (stops iOS zoom on focus).
- Respect iPhone safe areas (`env(safe-area-inset-*)`) for the bottom bar and sheets.
- Support light and dark mode via Tailwind `dark:` variants (follows the system setting).
- Habit colours are dynamic hex values, so apply them with inline `style`, not generated Tailwind classes.
- Charts: colours are CSS variables in `index.css` (`--series-1/2`, validated colour-blind safe in both
  modes); 2px lines, ringed dots, hairline grid; a legend for 2+ series; every chart has a table view.

### Supabase + Vercel setup

- Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` locally (see
  `.env.example`, git-ignored) and in Vercel → Project Settings → Environment Variables.
  Only the publishable/anon key ever goes in the app — never the secret / service_role key.
- Single user: the account is created in the Supabase dashboard (Authentication → Users → Add user,
  auto-confirm) and public sign-ups are turned off. There is intentionally no sign-up screen.
