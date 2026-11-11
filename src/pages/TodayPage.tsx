import { Link } from 'react-router-dom'
import { CheckIcon } from '../components/icons'
import { PageHeader } from '../components/Layout'
import { useCompletions } from '../hooks/useCompletions'
import { useHabits } from '../hooks/useHabits'
import { useToday } from '../hooks/useToday'
import { formatLongDate, weekRange } from '../lib/dates'
import type { Completion, Habit } from '../lib/types'

export function TodayPage() {
  const today = useToday()
  const { start, end } = weekRange(today)
  const { habits, loading } = useHabits()
  // Load the whole week so weekly habits can show "2 / 3 this week".
  const { completions, addCompletion, deleteCompletion } = useCompletions(start, end)

  const doneCount = habits.filter((h) => completions.some((c) => c.habitId === h.id && c.date === today)).length

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={formatLongDate(today)}
        action={
          habits.length > 0 && (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {doneCount}/{habits.length} done
            </p>
          )
        }
      />

      {!loading && habits.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
          Nothing to track yet.{' '}
          <Link to="/habits" className="font-semibold text-slate-900 underline dark:text-white">
            Add a habit
          </Link>{' '}
          to get started.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {habits.map((habit) => (
          <li key={habit.id}>
            <HabitCard
              habit={habit}
              weekCompletions={completions.filter((c) => c.habitId === habit.id)}
              today={today}
              onComplete={() => addCompletion(habit.id, today)}
              onUndo={(c) => deleteCompletion(c.id)}
            />
          </li>
        ))}
      </ul>
    </>
  )
}

interface CardProps {
  habit: Habit
  weekCompletions: Completion[]
  today: string
  onComplete: () => void
  onUndo: (completion: Completion) => void
}

function HabitCard({ habit, weekCompletions, today, onComplete, onUndo }: CardProps) {
  // At most one completion counts per habit per day; undo removes today's record.
  const todays = weekCompletions.filter((c) => c.date === today)
  const doneToday = todays.length > 0
  const latestToday = todays.at(-1)

  const { frequency } = habit
  const isWeekly = frequency.type === 'weekly'
  const weeklyTarget = frequency.type === 'weekly' ? frequency.timesPerWeek : 0
  const daysThisWeek = new Set(weekCompletions.map((c) => c.date)).size

  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      style={doneToday ? { boxShadow: `inset 4px 0 0 ${habit.color}` } : undefined}
    >
      <button
        type="button"
        onClick={doneToday ? undefined : onComplete}
        disabled={doneToday}
        aria-label={doneToday ? `${habit.name} done` : `Mark ${habit.name} done`}
        className="flex min-h-20 flex-1 items-center gap-4 rounded-xl p-2 text-left transition active:scale-[0.98] disabled:active:scale-100"
      >
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 transition-colors"
          style={{
            borderColor: habit.color,
            backgroundColor: doneToday ? habit.color : 'transparent',
          }}
        >
          {doneToday && <CheckIcon className="size-8 text-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-lg font-semibold ${doneToday ? 'text-slate-400 line-through' : ''}`}>
            {habit.name}
          </span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {isWeekly
              ? `${Math.min(daysThisWeek, weeklyTarget)} / ${weeklyTarget} this week${
                  daysThisWeek >= weeklyTarget ? ' ✓' : ''
                }`
              : doneToday
                ? 'Done today'
                : 'Tap to complete'}
          </span>
        </span>
      </button>

      {latestToday && (
        <button
          type="button"
          onClick={() => onUndo(latestToday)}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Undo
        </button>
      )}
    </div>
  )
}
