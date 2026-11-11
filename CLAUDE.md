# Habit Tracker

Personal workout and habit tracker for a single user. **Phone first**, but must also look good on a laptop.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`; no `tailwind.config` file — config lives in `src/index.css`)
- React Router (`react-router-dom`) for the 4 pages
- Data: `localStorage` for now → **Supabase** later
- Hosting: **Vercel** later (`vercel.json` already rewrites all paths to `index.html` for client-side routing)

## Commands

- `npm run dev` — dev server on port 5173, listening on the LAN (`server.host: true`) so a phone on the same Wi-Fi can open it
- `npm run build` — type-check and build to `dist/`
- `npm run lint` — oxlint

## Folder structure

```
src/
  main.tsx              entry point
  App.tsx               routes
  index.css             Tailwind import + global styles
  components/
    Layout.tsx          bottom tab bar (phone) / sidebar (md+), PageHeader
    HabitForm.tsx       add/edit/delete habit sheet
    icons.tsx           inline SVG icons
  pages/
    TodayPage.tsx       today's habits, tap to complete, undo
    HabitsPage.tsx      list + add/edit/delete habits
    WorkoutsPage.tsx    placeholder
    StatsPage.tsx       placeholder
  hooks/
    useHabits.ts        load + mutate habits (via storage)
    useCompletions.ts   load + mutate completions for a date range (via storage)
    useToday.ts         today's local date key, rolls over at midnight
  lib/
    storage.ts          THE ONLY place that reads/writes persisted data
    types.ts            Habit, Completion, DateKey, HabitInput
    dates.ts            local date-key helpers (toDateKey, weekRange, ...)
    colors.ts           habit colour palette
```

## Rules

### Storage

- **All reading and saving goes through `src/lib/storage.ts`.** Pages, components and hooks must never
  call `localStorage` (or later, Supabase) directly.
- Every storage function is `async` and returns a Promise, even for localStorage, so it can be swapped for
  a Supabase implementation with the same signatures and no page changes.
- IDs are UUID v4 strings (matches Supabase `uuid` columns). Do not use `crypto.randomUUID()` on its own —
  it is unavailable over plain `http://` on the LAN (phone testing). Use `newId()` in `storage.ts`.
- Deleting a habit also deletes its completions (mirrors `ON DELETE CASCADE`).

### Data

- **Completions are separate records** (`{ id, habitId, date, createdAt }`), one per tap — never counters.
  All progress (done today, X / Y this week, streaks, stats) is computed by counting records.
- A habit counts at most once per day; "undo" deletes today's completion record.
- **Calendar dates are local `"YYYY-MM-DD"` strings in the user's own time zone, never UTC.**
  Use `toDateKey()` / `todayKey()` / `fromDateKey()` from `src/lib/dates.ts`.
  Never use `toISOString()` or `new Date("YYYY-MM-DD")` for calendar dates (both are UTC).
  `createdAt` timestamps are instants, so ISO/UTC is fine there.
- In Supabase, store `date` as a Postgres `date` column holding the local key as-is.
- Weeks start on Monday (`WEEK_STARTS_ON` in `dates.ts`).
- Habit frequency is either `{ type: 'daily' }` or `{ type: 'weekly', timesPerWeek: 1–7 }`.

### UI

- Phone first: design for ~375px wide, then enhance at `md:` (768px+), where the bottom nav is replaced by a sidebar.
- Tap targets at least 44px; inputs at least 16px font (stops iOS zoom on focus).
- Respect iPhone safe areas (`env(safe-area-inset-*)`) for the bottom bar and sheets.
- Support light and dark mode via Tailwind `dark:` variants (follows the system setting).
- Habit colours are dynamic hex values, so apply them with inline `style`, not generated Tailwind classes.

### Future: Supabase + Vercel

- Env vars go in `.env.local` (see `.env.example`); only `VITE_`-prefixed vars reach the browser.
- Planned tables are documented at the top of `storage.ts`.
