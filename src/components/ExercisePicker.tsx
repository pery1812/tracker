import { useEffect, useState, type FormEvent } from 'react'
import { FIELD_PRESETS, nameTaken, pickerGroups } from '../lib/exercises'
import type { Exercise } from '../lib/program'
import type { CustomExerciseInput } from '../lib/types'

interface Props {
  custom: Exercise[]
  /** Exercises already in the session; not offered again. */
  excludeIds: Set<string>
  onPick: (exercise: Exercise) => Promise<void>
  onCreate: (input: CustomExerciseInput) => Promise<Exercise>
  onClose: () => void
}

/** Bottom sheet on phones, centred dialog on wider screens: search, pick, or create an exercise. */
export function ExercisePicker({ custom, excludeIds, onPick, onCreate, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups = pickerGroups(custom, excludeIds, query)
  const trimmed = query.trim()
  const canCreate = trimmed.length > 0 && !nameTaken(custom, trimmed)

  async function pick(exercise: Exercise) {
    if (busy) return
    setBusy(true)
    try {
      await onPick(exercise)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Add exercise">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-xl md:rounded-3xl dark:bg-slate-900">
        {creating ? (
          <CreateForm
            initialName={trimmed}
            custom={custom}
            onCancel={() => setCreating(false)}
            onSave={async (input) => {
              const exercise = await onCreate(input)
              await pick(exercise)
            }}
          />
        ) : (
          <>
            <div className="p-5 pb-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">Add exercise</h2>
                <button type="button" onClick={onClose} className="text-sm font-medium text-slate-500">
                  Cancel
                </button>
              </div>
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type a new exercise"
                aria-label="Search exercises"
                className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setCreating(true)}
                disabled={trimmed.length > 0 && !canCreate}
                className="mb-4 flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left font-semibold text-white disabled:hidden dark:bg-white dark:text-slate-900"
              >
                <span className="text-lg">+</span>
                <span className="min-w-0 flex-1 truncate">{trimmed ? `Create “${trimmed}”` : 'Create a new exercise'}</span>
              </button>

              {groups.length === 0 && trimmed && (
                <p className="mb-4 text-sm text-slate-500">No exercise matches “{trimmed}”.</p>
              )}

              {groups.map((g) => (
                <section key={g.title} className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.title}</h3>
                  <ul>
                    {g.exercises.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => pick(e)}
                          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <span className="min-w-0 flex-1">{e.name}</span>
                          {e.perSide && <span className="shrink-0 text-xs text-slate-400">L/R</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CreateForm({
  initialName,
  custom,
  onSave,
  onCancel,
}: {
  initialName: string
  custom: Exercise[]
  onSave: (input: CustomExerciseInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [preset, setPreset] = useState(0)
  const [perSide, setPerSide] = useState(false)
  const [saving, setSaving] = useState(false)
  const trimmed = name.trim()
  const taken = trimmed.length > 0 && nameTaken(custom, trimmed)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || taken || saving) return
    setSaving(true)
    try {
      await onSave({ name: trimmed, fields: FIELD_PRESETS[preset].fields, perSide })
    } catch (err) {
      setSaving(false) // keep the form so nothing is lost; the error banner says why
      throw err
    }
  }

  return (
    <form onSubmit={submit} className="overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <h2 className="mb-4 text-xl font-bold">New exercise</h2>

      <label className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300" htmlFor="exercise-name">
        Name
      </label>
      <input
        id="exercise-name"
        autoFocus={!initialName}
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Hip thrust"
        className="mb-1 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base outline-none focus:border-slate-900 dark:border-slate-700 dark:focus:border-white"
      />
      <p className="mb-4 h-4 text-xs text-red-600 dark:text-red-400">{taken ? 'You already have an exercise with this name.' : ''}</p>

      <fieldset className="mb-4">
        <legend className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">What do you log for each set?</legend>
        <div className="flex flex-col gap-2">
          {FIELD_PRESETS.map((p, i) => (
            <label
              key={p.label}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ring-1 ${
                preset === i ? 'ring-2 ring-slate-900 dark:ring-white' : 'ring-slate-200 dark:ring-slate-700'
              }`}
            >
              <input type="radio" name="preset" checked={preset === i} onChange={() => setPreset(i)} className="size-4" />
              <span>
                <span className="block font-medium">{p.label}</span>
                <span className="block text-xs text-slate-500">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mb-6 flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" checked={perSide} onChange={(e) => setPerSide(e.target.checked)} className="size-5" />
        <span>
          <span className="block font-medium">Log left and right separately</span>
          <span className="block text-xs text-slate-500">Single-leg or single-arm work, left first</span>
        </span>
      </label>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={!trimmed || taken || saving}
          className="w-full rounded-xl bg-slate-900 py-3.5 font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          Create and add
        </button>
        <button type="button" onClick={onCancel} className="w-full rounded-xl py-3 font-medium text-slate-600 dark:text-slate-300">
          Back
        </button>
      </div>
    </form>
  )
}
