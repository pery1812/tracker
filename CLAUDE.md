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

## Folder structure

```
supabase/
  migrations/           SQL schema + RLS policies; run in the Supabase SQL editor
src/
  main.tsx              entry point
  App.tsx               session gate (sign-in vs app) + routes
  index.css             Tailwind import + global styles
  components/
    Layout.tsx          bottom tab bar (phone) / sidebar (md+), PageHeader, SignOutButton
    HabitForm.tsx       add/edit/delete habit sheet
    ImportLocalData.tsx one-time offer to copy pre-Supabase localStorage data to the account
    ErrorBanner.tsx     shows any failed save/load (catches unhandled promise rejections)
    icons.tsx           inline SVG icons
  pages/
    SignInPage.tsx      email + password; shows setup help if env vars are missing
    TodayPage.tsx       today's habits, tap to complete, undo
    HabitsPage.tsx      list + add/edit/delete habits
    WorkoutsPage.tsx    placeholder
    StatsPage.tsx       placeholder
  hooks/
    useSession.ts       current Supabase session (undefined = loading, null = signed out)
    useHabits.ts        load + mutate habits (via storage), live-updates
    useCompletions.ts   load + mutate completions for a date range (via storage), optimistic, live-updates
    useToday.ts         today's local date key, rolls over at midnight
  lib/
    supabase.ts         the Supabase client (reads VITE_ env vars)
    storage.ts          THE ONLY place that reads/writes habit data
    auth.ts             sign in / sign out / session
    types.ts            Habit, Completion, DateKey, HabitInput
    dates.ts            local date-key helpers (toDateKey, weekRange, ...)
    colors.ts           habit colour palette
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

### UI

- Phone first: design for ~375px wide, then enhance at `md:` (768px+), where the bottom nav is replaced by a sidebar.
- Tap targets at least 44px; inputs at least 16px font (stops iOS zoom on focus).
- Respect iPhone safe areas (`env(safe-area-inset-*)`) for the bottom bar and sheets.
- Support light and dark mode via Tailwind `dark:` variants (follows the system setting).
- Habit colours are dynamic hex values, so apply them with inline `style`, not generated Tailwind classes.

### Supabase + Vercel setup

- Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` locally (see
  `.env.example`, git-ignored) and in Vercel → Project Settings → Environment Variables.
  Only the publishable/anon key ever goes in the app — never the secret / service_role key.
- Single user: the account is created in the Supabase dashboard (Authentication → Users → Add user,
  auto-confirm) and public sign-ups are turned off. There is intentionally no sign-up screen.
