import { useEffect, useState, type FormEvent } from 'react'
import { DEFAULT_HABIT_COLOR, HABIT_COLORS } from '../lib/colors'
import type { Habit, HabitInput } from '../lib/types'

interface Props {
  /** The habit being edited, or `null` when adding a new one. */
  habit: Habit | null
  onSave: (input: HabitInput) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

/** Bottom sheet on phones, centred dialog on wider screens. */
export function HabitForm({ habit, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? DEFAULT_HABIT_COLOR)
  const [freqType, setFreqType] = useState<'daily' | 'weekly'>(habit?.frequency.type ?? 'daily')
  const [timesPerWeek, setTimesPerWeek] = useState(
    habit?.frequency.type === 'weekly' ? habit.frequency.timesPerWeek : 3,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const trimmed = name.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await onSave({
        name: trimmed,
        color,
        frequency: freqType === 'daily' ? { type: 'daily' } : { type: 'weekly', timesPerWeek },
      })
    } catch (err) {
      setSaving(false) // keep the form open so nothing typed is lost; the error banner shows why
      throw err
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    try {
      await onDelete()
    } catch (err) {
      setSaving(false)
      throw err
    }
  }

  const segment = (active: boolean) =>
    `flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
      active
        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
        : 'text-slate-500 dark:text-slate-400'
    }`

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl md:rounded-3xl md:pb-6 dark:bg-slate-900"
      >
        <h2 className="mb-5 text-xl font-bold">{habit ? 'Edit habit' : 'New habit'}</h2>

        <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300" htmlFor="habit-name">
          Name
        </label>
        <input
          id="habit-name"
          autoFocus={!habit}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Drink 2L of water"
          // 16px+ font size stops iOS Safari from zooming in when the field is focused.
          className="mb-5 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
        />

        <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">Colour</p>
        <div className="mb-5 flex flex-wrap gap-3">
          {HABIT_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              aria-label={c.name}
              aria-pressed={color === c.hex}
              onClick={() => setColor(c.hex)}
              className={`size-10 rounded-full transition-transform ${
                color === c.hex
                  ? 'scale-110 ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-slate-900'
                  : ''
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">How often</p>
        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" className={segment(freqType === 'daily')} onClick={() => setFreqType('daily')}>
            Daily
          </button>
          <button type="button" className={segment(freqType === 'weekly')} onClick={() => setFreqType('weekly')}>
            Times per week
          </button>
        </div>

        {freqType === 'weekly' && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 dark:border-slate-700">
            <span className="text-sm">
              <strong className="text-lg">{timesPerWeek}</strong> times per week
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Fewer"
                disabled={timesPerWeek <= 1}
                onClick={() => setTimesPerWeek((n) => n - 1)}
                className="size-10 rounded-full bg-slate-100 text-xl font-bold disabled:opacity-30 dark:bg-slate-800"
              >
                −
              </button>
              <button
                type="button"
                aria-label="More"
                disabled={timesPerWeek >= 7}
                onClick={() => setTimesPerWeek((n) => n + 1)}
                className="size-10 rounded-full bg-slate-100 text-xl font-bold disabled:opacity-30 dark:bg-slate-800"
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="submit"
            disabled={!trimmed || saving}
            className="w-full rounded-xl bg-slate-900 py-3.5 font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
          >
            {habit ? 'Save changes' : 'Add habit'}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-3 font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className={`flex-1 rounded-xl py-3 font-medium ${
                  confirmDelete ? 'bg-red-600 text-white' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {confirmDelete ? 'Tap to confirm' : 'Delete'}
              </button>
            )}
          </div>
          {confirmDelete && (
            <p className="text-center text-xs text-slate-500">This also deletes its completion history.</p>
          )}
        </div>
      </form>
    </div>
  )
}
