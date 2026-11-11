import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { KneePainPicker } from '../components/KneePainPicker'
import { PageHeader } from '../components/Layout'
import { useToday } from '../hooks/useToday'
import { useProgramSettings, useWorkoutHistory } from '../hooks/useWorkouts'
import { addDays, formatShortDate, fromDateKey, weekRange } from '../lib/dates'
import { DELOAD_NOTE, KNEE_RULE, OTHER_DAYS, PHASES, PROGRAM_WEEKS, SESSIONS, SESSION_ORDER } from '../lib/program'
import { isDeloadWeek, isTestWeek, phaseForWeek, plannedSessionKey, programWeek } from '../lib/schedule'
import * as storage from '../lib/storage'
import type { DateKey, SessionKey, WorkoutSession } from '../lib/types'

const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

export function WorkoutsPage() {
  const today = useToday()
  const { settings, saveStart } = useProgramSettings()
  const [editingStart, setEditingStart] = useState(false)

  if (settings === undefined) return <PageHeader title="Workouts" />

  if (settings === null || editingStart) {
    return (
      <>
        <PageHeader title="Workouts" />
        <StartDateForm
          initial={settings?.startDate ?? weekRange(today).start}
          onSave={async (d) => {
            await saveStart(d)
            setEditingStart(false)
          }}
          onCancel={settings ? () => setEditingStart(false) : undefined}
        />
      </>
    )
  }

  return <WorkoutsOverview today={today} startDate={settings.startDate} onEditStart={() => setEditingStart(true)} />
}

function StartDateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: DateKey
  onSave: (d: DateKey) => Promise<void>
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initial)
  const isMonday = value && fromDateKey(value).getDay() === 1
  return (
    <form
      className={card}
      onSubmit={(e) => {
        e.preventDefault()
        if (value) void onSave(value)
      }}
    >
      <h2 className="mb-1 font-semibold">Bulletproof Volleyball Program</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        When was (or is) the Monday of week 1? This sets your week, phase, deloads and test days.
      </p>
      <input
        type="date"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mb-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base dark:border-slate-700"
      />
      {value && !isMonday && <p className="mb-2 text-sm text-amber-700 dark:text-amber-300">That’s not a Monday — weeks will start on that weekday.</p>}
      <div className="mt-3 flex gap-3">
        <button type="submit" className="flex-1 rounded-xl bg-slate-900 py-3 font-semibold text-white dark:bg-white dark:text-slate-900">
          Save
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl py-3 font-medium text-slate-600 dark:text-slate-300">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function WorkoutsOverview({ today, startDate, onEditStart }: { today: DateKey; startDate: DateKey; onEditStart: () => void }) {
  const navigate = useNavigate()
  const history = useWorkoutHistory(addDays(today, -7 * 16), today)
  const week = programWeek(startDate, today)
  const phase = phaseForWeek(week)
  const planned = plannedSessionKey(today)
  const { start: weekStart, end: weekEnd } = weekRange(today)

  const sessions = history?.sessions ?? []
  const sets = history?.sets ?? []
  const setCount = (id: string) => sets.filter((s) => s.sessionId === id).length

  async function open(key: SessionKey, date: DateKey = today) {
    const session = await storage.getOrCreateWorkoutSession(date, key)
    navigate(`/workouts/s/${session.id}`)
  }

  const todaysSession = planned ? sessions.find((s) => s.date === today && s.sessionKey === planned) : undefined
  const thisWeek = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd)

  // Knee rule: the latest rated session in the last week.
  const latestRated = [...sessions].reverse().find((s) => s.kneePain != null && s.date >= addDays(today, -7))
  const kneeOver =
    latestRated &&
    ((latestRated.kneePain ?? 0) > KNEE_RULE.limit || (latestRated.kneePainNextMorning ?? 0) > KNEE_RULE.limit)
  // Ask for the next-morning rating on the morning after a rated session.
  const needsMorning = [...sessions]
    .reverse()
    .find((s) => s.kneePain != null && s.kneePainNextMorning == null && s.date < today && s.date >= addDays(today, -2))

  return (
    <>
      <PageHeader title="Workouts" subtitle={week >= 1 && week <= PROGRAM_WEEKS ? `Week ${week} of ${PROGRAM_WEEKS}` : undefined} />

      <section className={`${card} mb-4`}>
        {week < 1 ? (
          <p className="font-semibold">Program starts {formatShortDate(startDate)}</p>
        ) : week > PROGRAM_WEEKS ? (
          <p className="font-semibold">Program complete — you’re past week {PROGRAM_WEEKS}. Logging continues with phase 3.</p>
        ) : (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                Phase {phase} · {PHASES[phase].name}
              </span>
              {isDeloadWeek(week) && <Badge tone="sky">Deload</Badge>}
              {isTestWeek(week) && <Badge tone="violet">Test week</Badge>}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{PHASES[phase].goal}</p>
            {isDeloadWeek(week) && <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">{DELOAD_NOTE}</p>}
          </>
        )}
        <button type="button" onClick={onEditStart} className="mt-3 text-sm font-medium text-slate-500 underline">
          Week 1 started {formatShortDate(startDate)} · change
        </button>
      </section>

      {needsMorning && <MorningKneeCheck session={needsMorning} />}

      {kneeOver && (
        <section className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-900">
          <p className="mb-1 font-semibold">
            Knee rule: {latestRated.kneePain}/10 on {formatShortDate(latestRated.date)}
            {latestRated.kneePainNextMorning != null && `, ${latestRated.kneePainNextMorning}/10 next morning`}
          </p>
          <p className="mb-2">{KNEE_RULE.text}</p>
          <p className="text-amber-800 dark:text-amber-200">{KNEE_RULE.seePhysio}</p>
        </section>
      )}

      <section className={`${card} mb-4`}>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today</p>
        {planned ? (
          <>
            <h2 className="text-xl font-bold">{SESSIONS[planned].title}</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {SESSIONS[planned].goal} · {SESSIONS[planned].minutes}
            </p>
            <button
              type="button"
              onClick={() => open(planned)}
              className="w-full rounded-xl bg-slate-900 py-3.5 font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              {todaysSession ? `Continue (${setCount(todaysSession.id)} sets logged)` : 'Start session'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold">{OTHER_DAYS[fromDateKey(today).getDay()].title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{OTHER_DAYS[fromDateKey(today).getDay()].goal}</p>
          </>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-500">Doing a different session today?</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SESSION_ORDER.filter((k) => k !== planned).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => open(k)}
                className="rounded-xl bg-slate-100 px-3 py-3 text-left text-sm font-semibold dark:bg-slate-800"
              >
                {SESSIONS[k].title}
              </button>
            ))}
          </div>
        </details>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">This week</h2>
        <div className="grid grid-cols-4 gap-2">
          {SESSION_ORDER.map((k) => {
            const done = thisWeek.find((s) => s.sessionKey === k && setCount(s.id) > 0)
            const label = fromDateKey(addDays(weekStart, SESSIONS[k].weekday - 1)).toLocaleDateString(undefined, { weekday: 'short' })
            const inner = (
              <>
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-lg">{done ? '✓' : '·'}</span>
              </>
            )
            const cls = `flex h-16 flex-col items-center justify-center rounded-xl ${
              done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`
            return done ? (
              <Link key={k} to={`/workouts/s/${done.id}`} className={cls} aria-label={`${SESSIONS[k].title} done`}>
                {inner}
              </Link>
            ) : (
              <div key={k} className={cls} aria-label={`${SESSIONS[k].title} not done`}>
                {inner}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">History</h2>
        {history && sessions.length === 0 && <p className="text-sm text-slate-500">No sessions logged yet.</p>}
        <ul className="flex flex-col gap-2">
          {[...sessions].reverse().map((s) => (
            <li key={s.id}>
              <Link to={`/workouts/s/${s.id}`} className={`${card} flex items-center gap-3`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{SESSIONS[s.sessionKey].title}</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {formatShortDate(s.date)} · Week {programWeek(startDate, s.date)} · {setCount(s.id)} sets
                  </span>
                </span>
                {s.kneePain != null && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      s.kneePain > KNEE_RULE.limit
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-50'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Knee {s.kneePain}/10
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function MorningKneeCheck({ session }: { session: WorkoutSession }) {
  const [saving, setSaving] = useState(false)
  return (
    <section className={`${card} mb-4`}>
      <KneePainPicker
        label={`Right knee this morning, after ${SESSIONS[session.sessionKey].title} (${formatShortDate(session.date)})?`}
        value={null}
        onChange={async (n) => {
          if (saving) return
          setSaving(true)
          try {
            await storage.updateWorkoutSession(session.id, { kneePainNextMorning: n })
          } finally {
            setSaving(false)
          }
        }}
      />
    </section>
  )
}
