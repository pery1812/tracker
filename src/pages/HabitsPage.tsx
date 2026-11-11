import { useState } from 'react'
import { HabitForm } from '../components/HabitForm'
import { PlusIcon } from '../components/icons'
import { PageHeader } from '../components/Layout'
import { useHabits } from '../hooks/useHabits'
import type { Habit } from '../lib/types'

function describeFrequency(habit: Habit): string {
  return habit.frequency.type === 'daily' ? 'Every day' : `${habit.frequency.timesPerWeek}× per week`
}

export function HabitsPage() {
  const { habits, loading, createHabit, updateHabit, deleteHabit } = useHabits()
  // `undefined` = form closed, `null` = adding a new habit, a Habit = editing it.
  const [editing, setEditing] = useState<Habit | null | undefined>(undefined)
  const close = () => setEditing(undefined)

  return (
    <>
      <PageHeader
        title="Habits"
        action={
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="flex items-center gap-1.5 rounded-full bg-slate-900 py-2.5 pr-5 pl-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            <PlusIcon className="size-5" /> Add
          </button>
        }
      />

      {!loading && habits.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
          No habits yet. Tap <strong>Add</strong> to create your first one.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {habits.map((habit) => (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() => setEditing(habit)}
              className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
            >
              <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{habit.name}</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">{describeFrequency(habit)}</span>
              </span>
              <span className="text-sm font-medium text-slate-400">Edit</span>
            </button>
          </li>
        ))}
      </ul>

      {editing !== undefined && (
        <HabitForm
          key={editing?.id ?? 'new'}
          habit={editing}
          onClose={close}
          onSave={async (input) => {
            if (editing) await updateHabit(editing.id, input)
            else await createHabit(input)
            close()
          }}
          onDelete={
            editing
              ? async () => {
                  await deleteHabit(editing.id)
                  close()
                }
              : undefined
          }
        />
      )}
    </>
  )
}
