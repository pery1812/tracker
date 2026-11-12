import { useMemo, useState } from 'react'
import { HabitHeatmap } from '../components/HabitHeatmap'
import { PageHeader } from '../components/Layout'
import { LineChart, type ChartSeries } from '../components/LineChart'
import { useCompletions } from '../hooks/useCompletions'
import { useHabits } from '../hooks/useHabits'
import { useToday } from '../hooks/useToday'
import { useCustomExercises, useProgramSettings, useWorkoutHistory } from '../hooks/useWorkouts'
import { addDays, formatShortDate, toDateKey, weekRange } from '../lib/dates'
import { chartableExercises, makeExerciseLookup } from '../lib/exercises'
import { FIELD_UNITS, KNEE_RULE, SESSION_ORDER, TESTS, isProgramSession, type Exercise } from '../lib/program'
import { programWeek } from '../lib/schedule'
import {
  dailyStreaks,
  exerciseProgress,
  leftRightRatio,
  primaryMetric,
  recentDays,
  recentWeeks,
  weeklyStreaks,
} from '../lib/stats'
import type { DateKey, Habit, WorkoutSession, WorkoutSet } from '../lib/types'

const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

export function StatsPage() {
  const [tab, setTab] = useState<'habits' | 'workouts'>('habits')
  const segment = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-semibold ${
      active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
    }`
  return (
    <>
      <PageHeader title="Stats" />
      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'habits'} className={segment(tab === 'habits')} onClick={() => setTab('habits')}>
          Habits
        </button>
        <button type="button" role="tab" aria-selected={tab === 'workouts'} className={segment(tab === 'workouts')} onClick={() => setTab('workouts')}>
          Workouts
        </button>
      </div>
      {tab === 'habits' ? <HabitStats /> : <WorkoutStats />}
    </>
  )
}

// ---------- habits ----------

function HabitStats() {
  const today = useToday()
  const { habits, loading } = useHabits()
  const earliest = habits.length ? habits.map((h) => toDateKey(new Date(h.createdAt))).sort()[0] : today
  // At least 12 weeks back so the heatmap is complete.
  const from = [earliest, addDays(weekRange(today).start, -7 * 11)].sort()[0]
  const { completions } = useCompletions(from, today)

  if (loading) return null
  if (habits.length === 0) return <Empty>Add a habit to see streaks here.</Empty>

  return (
    <div className="flex flex-col gap-4">
      {habits.map((habit) => {
        const dates = new Set(completions.filter((c) => c.habitId === habit.id).map((c) => c.date))
        return <HabitCard key={habit.id} habit={habit} dates={dates} today={today} />
      })}
    </div>
  )
}

function HabitCard({ habit, dates, today }: { habit: Habit; dates: Set<DateKey>; today: DateKey }) {
  const createdOn = toDateKey(new Date(habit.createdAt))
  const weekly = habit.frequency.type === 'weekly'
  const target = habit.frequency.type === 'weekly' ? habit.frequency.timesPerWeek : 1
  const streak = weekly ? weeklyStreaks(dates, target, today) : dailyStreaks(dates, today)
  const unit = (n: number) => (weekly ? (n === 1 ? 'week' : 'weeks') : n === 1 ? 'day' : 'days')
  const recent = weekly ? recentWeeks(dates, target, today, createdOn) : recentDays(dates, today, createdOn)

  return (
    <section className={card}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <span className="size-3 rounded-full" style={{ backgroundColor: habit.color }} />
        {habit.name}
        <span className="text-sm font-normal text-slate-500">{weekly ? `${target}× per week` : 'daily'}</span>
      </h2>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Tile label="Current streak" value={`${streak.current}`} sub={unit(streak.current)} />
        <Tile label="Best streak" value={`${streak.best}`} sub={unit(streak.best)} />
        {'hit' in recent ? (
          <Tile label="Last 4 weeks" value={`${recent.hit}/${recent.of}`} sub="weeks on target" />
        ) : (
          <Tile label={`Last ${recent.of} days`} value={`${Math.round((recent.done / recent.of) * 100)}%`} sub={`${recent.done} of ${recent.of}`} />
        )}
      </div>
      <HabitHeatmap color={habit.color} done={dates} today={today} createdOn={createdOn} />
    </section>
  )
}

// ---------- workouts ----------

function WorkoutStats() {
  const today = useToday()
  const { settings } = useProgramSettings()
  const from = settings?.startDate && settings.startDate < today ? settings.startDate : addDays(today, -7 * 12)
  const history = useWorkoutHistory(addDays(from, -7), today)
  const { customExercises } = useCustomExercises()

  if (settings === undefined || !history || !customExercises) return null
  const { sessions, sets } = history
  if (sessions.length === 0) return <Empty>Log a workout to see stats here.</Empty>

  const { start, end } = weekRange(today)
  // Program sessions only: custom workouts are extra and don't count towards the 4 planned days.
  const thisWeek = sessions.filter(
    (s) => isProgramSession(s.sessionKind) && s.date >= start && s.date <= end && sets.some((x) => x.sessionId === s.id),
  )
  const week = settings ? programWeek(settings.startDate, today) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Tile label="This week" value={`${thisWeek.length}/${SESSION_ORDER.length}`} sub="sessions" />
        <Tile label="Logged" value={`${sessions.length}`} sub="sessions" />
        <Tile label="Program" value={week && week >= 1 ? `${Math.min(week, 12)}` : '–'} sub="of 12 weeks" />
      </div>
      <KneeChart sessions={sessions} />
      <ExerciseProgress sessions={sessions} sets={sets} custom={customExercises} />
      <LeftRight sessions={sessions} sets={sets} custom={customExercises} />
      <TestResults sessions={sessions} sets={sets} startDate={settings?.startDate} />
    </div>
  )
}

function KneeChart({ sessions }: { sessions: WorkoutSession[] }) {
  const during = sessions.filter((s) => s.kneePain != null).map((s) => ({ date: s.date, value: s.kneePain! }))
  const morning = sessions
    .filter((s) => s.kneePainNextMorning != null)
    .map((s) => ({ date: s.date, value: s.kneePainNextMorning! }))
  const series: ChartSeries[] = [{ name: 'During session', color: 'var(--series-1)', points: during }]
  if (morning.length) series.push({ name: 'Next morning', color: 'var(--series-2)', points: morning })

  return (
    <section className={card}>
      <h2 className="font-semibold">Right knee</h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">0–10 per session. Aim: falling to 0–2.</p>
      {during.length === 0 ? (
        <p className="text-sm text-slate-500">Rate your knee at the end of a session to see the trend.</p>
      ) : (
        <LineChart
          series={series}
          unit="/10"
          label="Right knee pain per session, 0 to 10"
          yDomain={[0, 10]}
          reference={{ value: KNEE_RULE.limit, label: `Knee rule ${KNEE_RULE.limit}/10` }}
        />
      )}
    </section>
  )
}

function ExerciseProgress({ sessions, sets, custom }: { sessions: WorkoutSession[]; sets: WorkoutSet[]; custom: Exercise[] }) {
  const withData = useMemo(() => {
    const ids = new Set(sets.map((s) => s.exerciseId))
    return chartableExercises(custom).filter((e) => ids.has(e.id))
  }, [sets, custom])
  const [chosen, setChosen] = useState<string>('')
  const chosenExercise = makeExerciseLookup(custom)(chosen)
  const exercise = (chosenExercise && withData.includes(chosenExercise) ? chosenExercise : undefined) ??
    withData.find((e) => e.id === 'deadlift') ??
    withData[0]

  if (!exercise) return null
  const metric = primaryMetric(exercise)
  const unit = metric === 'weightKg' ? 'kg' : metric === 'lengthCm' ? 'cm' : metric === 'durationS' ? 's' : 'reps'
  const what = metric === 'weightKg' ? 'Heaviest set' : metric === 'lengthCm' ? 'Highest' : metric === 'durationS' ? 'Longest hold' : 'Most reps'
  const perSide = sets.some((s) => s.exerciseId === exercise.id && s.side)
  const series: ChartSeries[] = perSide
    ? [
        { name: 'Left', color: 'var(--series-1)', points: exerciseProgress(exercise, sessions, sets, 'left') },
        { name: 'Right', color: 'var(--series-2)', points: exerciseProgress(exercise, sessions, sets, 'right') },
      ]
    : [{ name: exercise.name, color: 'var(--series-1)', points: exerciseProgress(exercise, sessions, sets) }]

  return (
    <section className={card}>
      <h2 className="mb-2 font-semibold">Progress</h2>
      <select
        value={exercise.id}
        onChange={(e) => setChosen(e.target.value)}
        aria-label="Exercise"
        className="mb-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-base dark:border-slate-700"
      >
        {withData.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{what} per session</p>
      <LineChart series={series} unit={unit} label={`${exercise.name}: ${what.toLowerCase()} per session`} />
    </section>
  )
}

/** Latest left vs right numbers for one-sided work. The program wants the left within 10% of the right. */
function LeftRight({ sessions, sets, custom }: { sessions: WorkoutSession[]; sets: WorkoutSet[]; custom: Exercise[] }) {
  const rows = chartableExercises(custom)
    .filter((e) => e.perSide)
    .map((e) => {
      const left = exerciseProgress(e, sessions, sets, 'left').at(-1)
      const right = exerciseProgress(e, sessions, sets, 'right').at(-1)
      return { e, left, right, ratio: leftRightRatio(left?.value, right?.value) }
    })
    .filter((r) => r.left && r.right)

  if (rows.length === 0) return null
  return (
    <section className={card}>
      <h2 className="font-semibold">Left vs right</h2>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Latest session. Aim: left within 10% of right.</p>
      <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map(({ e, left, right, ratio }) => {
          const off = ratio != null && Math.abs(1 - ratio) > 0.1
          return (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{e.name}</span>
              <span className="tabular-nums text-slate-600 dark:text-slate-300">
                L {left!.detail} · R {right!.detail}
              </span>
              {ratio != null && (
                <span
                  className={`w-14 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${
                    off ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-50' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-50'
                  }`}
                  title="Left as a percentage of right"
                >
                  {off ? '⚠ ' : '✓ '}
                  {Math.round(ratio * 100)}%
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function bestFor(exercise: Exercise, sets: WorkoutSet[], side: 'left' | 'right' | null): string {
  const metric = primaryMetric(exercise)
  if (!metric) return '–'
  const vals = sets.filter((s) => s.side === side).map((s) => s[metric]).filter((v): v is number => v != null)
  if (!vals.length) return '–'
  // Knee pain: lower is better; everything else: higher is better.
  const best = metric === 'pain' ? Math.min(...vals) : Math.max(...vals)
  return `${best}${FIELD_UNITS[exercise.fields[0]] === '/10' ? '/10' : ''}`
}

function TestResults({ sessions, sets, startDate }: { sessions: WorkoutSession[]; sets: WorkoutSet[]; startDate?: DateKey }) {
  const testIds = new Set(TESTS.map((t) => t.id))
  const testSessions = sessions.filter((s) => sets.some((x) => x.sessionId === s.id && testIds.has(x.exerciseId)))
  if (testSessions.length === 0) {
    return (
      <section className={card}>
        <h2 className="font-semibold">Tests</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Test results from Wednesday of weeks 1, 4, 8 and 12 will appear here.</p>
      </section>
    )
  }
  return (
    <section className={card}>
      <h2 className="mb-3 font-semibold">Tests</h2>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full text-left text-sm tabular-nums">
          <thead>
            <tr className="text-slate-500">
              <th className="w-full min-w-28 py-1 pr-3 font-medium">Test</th>
              {testSessions.map((s) => (
                <th key={s.id} className="py-1 pr-3 font-medium whitespace-nowrap">
                  {startDate ? `Wk ${programWeek(startDate, s.date)}` : formatShortDate(s.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TESTS.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-3 leading-snug">
                  {t.name} <span className="text-slate-400">{FIELD_UNITS[t.fields[0]]}</span>
                </td>
                {testSessions.map((s) => {
                  const these = sets.filter((x) => x.sessionId === s.id && x.exerciseId === t.id)
                  return (
                    <td key={s.id} className="py-1.5 pr-3 align-top whitespace-nowrap">
                      {t.perSide ? (
                        <>
                          L {bestFor(t, these, 'left')}
                          <br />R {bestFor(t, these, 'right')}
                        </>
                      ) : (
                        bestFor(t, these, null)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Best of each test. Deadlift progress is in the chart above.</p>
    </section>
  )
}

// ---------- shared ----------

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">{children}</div>
  )
}
