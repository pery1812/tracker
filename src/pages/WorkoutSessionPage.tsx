import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { ExercisePicker } from '../components/ExercisePicker'
import { KneePainPicker } from '../components/KneePainPicker'
import { useToday } from '../hooks/useToday'
import { useCustomExercises, useProgramSettings, useWorkoutHistory, useWorkoutSession } from '../hooks/useWorkouts'
import { addDays, formatShortDate } from '../lib/dates'
import { makeExerciseLookup, plannedExtra } from '../lib/exercises'
import { DELOAD_NOTE, FIELD_UNITS, PHASES, isProgramSession, sessionTitle, type Field } from '../lib/program'
import { isDeloadWeek, isTestWeek, phaseForWeek, planSession, programWeek, type PlannedExercise } from '../lib/schedule'
import { describeSets, formatSet, suggestIncrease } from '../lib/stats'
import type { DateKey, Side, WorkoutSet, WorkoutSetInput } from '../lib/types'

const card = 'rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
const NO_DATE = '1900-01-01'

export function WorkoutSessionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const today = useToday()
  const { settings } = useProgramSettings()
  const { session, sets, loading, addSet, deleteSet, updateSession, deleteSession } = useWorkoutSession(id)
  // Earlier sessions (including ones earlier the same day), for "last time" numbers.
  const history = useWorkoutHistory(session ? addDays(session.date, -120) : NO_DATE, session ? session.date : NO_DATE)
  const { customExercises, createCustomExercise } = useCustomExercises()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [picking, setPicking] = useState(false)

  if (loading || settings === undefined || customExercises === undefined) return null
  if (!session) {
    return (
      <div className={card}>
        <p className="mb-2 font-semibold">This session no longer exists.</p>
        <Link to="/workouts" className="font-semibold underline">
          Back to workouts
        </Link>
      </div>
    )
  }

  const week = settings ? programWeek(settings.startDate, session.date) : 1
  const phase = phaseForWeek(week)
  const kind = session.sessionKind
  const isProgram = isProgramSession(kind)
  const plan = isProgram ? planSession(kind, week) : []
  const plannedIds = new Set(plan.map((p) => p.exercise.id))

  // Exercises added by hand, plus any with logged sets that the plan no longer includes
  // (e.g. after changing the start date), so no logged set is ever hidden.
  const lookup = makeExerciseLookup(customExercises)
  const extraIds = [...new Set([...session.extraExerciseIds, ...sets.map((s) => s.exerciseId)])].filter((x) => !plannedIds.has(x))
  const extras = extraIds.flatMap((x) => {
    const exercise = lookup(x)
    return exercise ? [plannedExtra(exercise, week)] : []
  })
  const unknownSets = sets.filter((s) => !plannedIds.has(s.exerciseId) && !lookup(s.exerciseId))
  const inSession = new Set([...plannedIds, ...extraIds])

  const addExercise = (exerciseId: string) => updateSession({ extraExerciseIds: [...session.extraExerciseIds, exerciseId] })
  const removeExercise = (exerciseId: string) =>
    updateSession({ extraExerciseIds: session.extraExerciseIds.filter((x) => x !== exerciseId) })

  /** Most recent earlier session that included this exercise. */
  function lastTime(exerciseId: string): { date: DateKey; sets: WorkoutSet[] } | null {
    if (!history || !session) return null
    const earlier = history.sessions
      .filter((s) => s.date < session.date || (s.date === session.date && s.createdAt < session.createdAt))
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    for (const s of earlier.reverse()) {
      const found = history.sets.filter((x) => x.sessionId === s.id && x.exerciseId === exerciseId)
      if (found.length) return { date: s.date, sets: found }
    }
    return null
  }

  return (
    <>
      <Link to="/workouts" className="mb-3 inline-block text-sm font-medium text-slate-500">
        ‹ Workouts
      </Link>
      <header className="mb-4">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {formatShortDate(session.date)} · Week {week} · Phase {phase} {PHASES[phase].name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{sessionTitle(kind)}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {isProgram && isDeloadWeek(week) && <Badge tone="sky">Deload</Badge>}
          {kind === 'wed' && isTestWeek(week) && <Badge tone="violet">Test day</Badge>}
        </div>
        {isProgram && isDeloadWeek(week) && <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">{DELOAD_NOTE}</p>}
      </header>

      <div className="flex flex-col gap-3">
        {plan.map((p, i) => (
          <div key={p.exercise.id}>
            {p.isTest && !plan[i - 1]?.isTest && <SectionTitle>Tests — after the warm-up</SectionTitle>}
            {!p.isTest && plan[i - 1]?.isTest && <SectionTitle>Session</SectionTitle>}
            <ExerciseCard
              planned={p}
              sessionId={session.id}
              sets={sets.filter((s) => s.exerciseId === p.exercise.id)}
              last={lastTime(p.exercise.id)}
              onAdd={addSet}
              onDelete={deleteSet}
            />
          </div>
        ))}

        {extras.length > 0 && isProgram && <SectionTitle>Added</SectionTitle>}
        {extras.map((p) => (
          <ExerciseCard
            key={p.exercise.id}
            planned={p}
            sessionId={session.id}
            sets={sets.filter((s) => s.exerciseId === p.exercise.id)}
            last={lastTime(p.exercise.id)}
            onAdd={addSet}
            onDelete={deleteSet}
            onRemove={session.extraExerciseIds.includes(p.exercise.id) ? () => removeExercise(p.exercise.id) : undefined}
          />
        ))}

        {!isProgram && extras.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700">
            Add the exercises you’re doing today — from your program or your own.
          </div>
        )}

        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 font-semibold text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
        >
          + Add exercise
        </button>

        {unknownSets.length > 0 && (
          <p className="text-sm text-slate-500">{unknownSets.length} logged sets belong to an exercise that no longer exists.</p>
        )}
      </div>

      {picking && (
        <ExercisePicker
          custom={customExercises}
          excludeIds={inSession}
          onPick={(e) => addExercise(e.id)}
          onCreate={createCustomExercise}
          onClose={() => setPicking(false)}
        />
      )}

      <section className={`${card} mt-6 flex flex-col gap-5`}>
        <KneePainPicker
          label="Right knee during this session (0–10)"
          value={session.kneePain}
          onChange={(n) => updateSession({ kneePain: n })}
        />
        {session.date < today && (
          <KneePainPicker
            label="Right knee the next morning"
            value={session.kneePainNextMorning}
            onChange={(n) => updateSession({ kneePainNextMorning: n })}
          />
        )}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Notes</span>
          <textarea
            key={session.notes}
            defaultValue={session.notes}
            maxLength={2000}
            rows={3}
            placeholder="How did it feel? Scrimmage this week? Anything swapped?"
            onBlur={(e) => {
              if (e.target.value !== session.notes) void updateSession({ notes: e.target.value })
            }}
            className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base dark:border-slate-700"
          />
        </label>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/workouts')}
          className="w-full rounded-xl bg-slate-900 py-3.5 font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          Done
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true)
            await deleteSession()
            navigate('/workouts')
          }}
          className={`w-full rounded-xl py-3 font-medium ${confirmDelete ? 'bg-red-600 text-white' : 'text-red-600 dark:text-red-400'}`}
        >
          {confirmDelete ? 'Tap again to delete this session and its sets' : 'Delete session'}
        </button>
      </div>
    </>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mt-3 mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{children}</h2>
}

// ---------- one exercise ----------

interface Slot {
  setNumber: number
  side: Side | null
}

type Values = Partial<Record<Field, string>>

interface CardProps {
  planned: PlannedExercise
  sessionId: string
  sets: WorkoutSet[]
  last: { date: DateKey; sets: WorkoutSet[] } | null
  onAdd: (input: WorkoutSetInput) => Promise<void>
  onDelete: (set: WorkoutSet) => Promise<void>
  /** Removes an exercise that was added by hand. Only offered while it has no logged sets. */
  onRemove?: () => void
}

function ExerciseCard({ planned, sessionId, sets, last, onAdd, onDelete, onRemove }: CardProps) {
  const { exercise, rx, label, perSide } = planned
  const [extra, setExtra] = useState(0)
  const [showCue, setShowCue] = useState(false)
  const sides: (Side | null)[] = perSide ? ['left', 'right'] : [null]

  const loggedCount = Math.max(rx.sets, ...sets.map((s) => s.setNumber))
  const slots: Slot[] = []
  for (let n = 1; n <= loggedCount + extra; n++) for (const side of sides) slots.push({ setNumber: n, side })

  const find = (slot: Slot) => sets.find((s) => s.setNumber === slot.setNumber && s.side === slot.side)
  const done = slots.filter(find).length
  const increase = last && suggestIncrease(exercise, rx, last.sets.filter((s) => s.side !== 'right'))

  function prefill(slot: Slot): Values {
    const sameSide = (s: WorkoutSet) => s.side === slot.side
    const earlierHere = sets.filter((s) => sameSide(s) && s.setNumber < slot.setNumber).sort((a, b) => b.setNumber - a.setNumber)[0]
    const lastSame = last?.sets.find((s) => sameSide(s) && s.setNumber === slot.setNumber) ?? last?.sets.find(sameSide)
    const source = earlierHere ?? lastSame
    const v: Values = {}
    for (const f of exercise.fields) {
      if (f === 'kg') v.kg = str(source?.weightKg ?? rx.kg)
      if (f === 'reps') v.reps = str(rx.reps ?? source?.reps)
      if (f === 'sec') v.sec = str(rx.seconds ?? source?.durationS)
      if (f === 'cm') v.cm = str(source?.lengthCm)
    }
    return v
  }

  async function log(slot: Slot, values: Values) {
    await onAdd({
      sessionId,
      exerciseId: exercise.id,
      setNumber: slot.setNumber,
      side: slot.side,
      reps: int(values.reps),
      weightKg: dec(values.kg),
      durationS: int(values.sec),
      lengthCm: dec(values.cm),
      pain: int(values.pain),
    })
  }

  const complete = done >= rx.sets * sides.length

  return (
    <article className={`${card} ${complete ? 'ring-emerald-300 dark:ring-emerald-800' : ''}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${
            complete ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {complete ? '✓' : label}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{exercise.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{rx.text}</p>
          {last && last.sets.length > 0 && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Last time ({formatShortDate(last.date)}): {describeLast(planned, last.sets)}
            </p>
          )}
          {increase && (
            <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              ↑ Every set hit {rx.reps} reps last time — try +2.5 kg if it was at the target RPE
            </p>
          )}
          {exercise.cue && (
            <button type="button" onClick={() => setShowCue((v) => !v)} className="mt-1 text-sm font-medium text-slate-500 underline">
              {showCue ? 'Hide how' : 'How'}
            </button>
          )}
          {showCue && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{exercise.cue}</p>}
        </div>
      </div>

      {exercise.fields.length === 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => {
            const logged = find(slot)
            return (
              <button
                key={`${slot.setNumber}-${slot.side}`}
                type="button"
                aria-pressed={Boolean(logged)}
                aria-label={rx.sets === 1 ? undefined : `Set ${slot.setNumber} done`}
                onClick={() => (logged ? onDelete(logged) : log(slot, {}))}
                className={`h-11 min-w-11 rounded-xl px-3 text-sm font-semibold ${
                  logged ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {rx.sets === 1 ? (logged ? '✓ Done' : 'Mark done') : logged ? '✓' : slot.setNumber}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {slots.map((slot) => {
            const logged = find(slot)
            const slotLabel = `${slot.setNumber}${slot.side ? (slot.side === 'left' ? ' L' : ' R') : ''}`
            return logged ? (
              <LoggedRow key={`${slot.setNumber}-${slot.side}`} label={slotLabel} text={formatSet(exercise, logged)} onUndo={() => onDelete(logged)} />
            ) : (
              <PendingRow
                key={`${slot.setNumber}-${slot.side}-${JSON.stringify(prefill(slot))}`}
                label={slotLabel}
                fields={exercise.fields}
                initial={prefill(slot)}
                onLog={(v) => log(slot, v)}
              />
            )
          })}
        </div>
      )}

      <div className="mt-3 flex justify-between">
        <button type="button" onClick={() => setExtra((n) => n + 1)} className="text-sm font-medium text-slate-500">
          + Add set
        </button>
        {onRemove && sets.length === 0 && (
          <button type="button" onClick={onRemove} className="text-sm font-medium text-red-600 dark:text-red-400">
            Remove
          </button>
        )}
      </div>
    </article>
  )
}

function describeLast(planned: PlannedExercise, sets: WorkoutSet[]): string {
  if (!planned.perSide) return describeSets(planned.exercise, sets)
  const left = sets.filter((s) => s.side === 'left')
  const right = sets.filter((s) => s.side === 'right')
  return `L ${describeSets(planned.exercise, left) || '–'} · R ${describeSets(planned.exercise, right) || '–'}`
}

function LoggedRow({ label, text, onUndo }: { label: string; text: string; onUndo: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 py-1 pr-1 pl-3 dark:bg-emerald-950">
      <span className="w-10 shrink-0 text-sm font-semibold text-emerald-800 tabular-nums dark:text-emerald-200">{label}</span>
      <span className="flex-1 font-semibold">{text}</span>
      <button
        type="button"
        onClick={onUndo}
        aria-label={`Undo set ${label}`}
        className="h-11 rounded-lg px-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
      >
        Undo
      </button>
    </div>
  )
}

function PendingRow({
  label,
  fields,
  initial,
  onLog,
}: {
  label: string
  fields: Field[]
  initial: Values
  onLog: (v: Values) => Promise<void>
}) {
  const [values, setValues] = useState<Values>(initial)
  const [saving, setSaving] = useState(false)
  // Weight and box height may be left empty (bodyweight / not measured); everything else is required.
  const ready = fields.every((f) => f === 'kg' || f === 'cm' || (values[f] ?? '') !== '')

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ready || saving) return
        setSaving(true)
        try {
          await onLog(values)
        } finally {
          setSaving(false)
        }
      }}
    >
      <span className="w-10 shrink-0 pl-3 text-sm font-semibold text-slate-500 tabular-nums">{label}</span>
      {fields.map((f) => (
        <label key={f} className="relative min-w-0 flex-1">
          <span className="sr-only">
            {label} {FIELD_UNITS[f]}
          </span>
          <input
            inputMode={f === 'kg' || f === 'cm' ? 'decimal' : 'numeric'}
            value={values[f] ?? ''}
            placeholder={f === 'kg' ? 'BW' : '–'}
            onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') }))}
            className="h-11 w-full rounded-xl border border-slate-300 bg-transparent pr-9 pl-3 text-base tabular-nums dark:border-slate-700"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">{FIELD_UNITS[f]}</span>
        </label>
      ))}
      <button
        type="submit"
        disabled={!ready || saving}
        aria-label={`Log set ${label}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white disabled:opacity-30 dark:bg-white dark:text-slate-900"
      >
        ✓
      </button>
    </form>
  )
}

const str = (n: number | null | undefined) => (n == null ? '' : String(n))
const int = (s: string | undefined) => (s ? Math.round(Number(s)) : null)
const dec = (s: string | undefined) => (s ? Math.round(Number(s) * 10) / 10 : null)
