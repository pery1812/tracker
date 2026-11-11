import { KNEE_RULE } from '../lib/program'

interface Props {
  value: number | null
  onChange: (value: number) => void
  label: string
}

/** 0–10 picker. Values above the knee rule limit (3) are marked in amber. */
export function KneePainPicker({ value, onChange, label }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</legend>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => {
          const selected = value === n
          const over = n > KNEE_RULE.limit
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${n} out of 10`}
              onClick={() => onChange(n)}
              className={`h-11 rounded-lg text-sm font-semibold tabular-nums transition-colors ${
                selected
                  ? over
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : over
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 flex justify-between text-xs text-slate-500">
        <span>No pain</span>
        <span>Above {KNEE_RULE.limit} = knee rule</span>
      </p>
    </fieldset>
  )
}
