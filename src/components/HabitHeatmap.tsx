import { useState } from 'react'
import { addDays, formatShortDate, weekRange } from '../lib/dates'
import type { DateKey } from '../lib/types'

interface Props {
  color: string
  done: Set<DateKey>
  today: DateKey
  createdOn: DateKey
  weeks?: number
}

/** Last N weeks as a Monday-to-Sunday grid (one column per week), filled in the habit colour. */
export function HabitHeatmap({ color, done, today, createdOn, weeks = 12 }: Props) {
  const [selected, setSelected] = useState<DateKey | null>(null)
  const firstMonday = addDays(weekRange(today).start, -7 * (weeks - 1))

  const days: DateKey[] = []
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) days.push(addDays(firstMonday, w * 7 + d))

  const count = days.filter((d) => done.has(d)).length

  return (
    <div>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-none text-slate-400" aria-hidden="true">
          {['M', '', 'W', '', 'F', '', 'S'].map((l, i) => (
            <span key={i} className="flex items-center">
              {l}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`${count} days done in the last ${weeks} weeks`}
          className="grid flex-1 grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
          onPointerLeave={() => setSelected(null)}
        >
          {days.map((d) => {
            const future = d > today
            const before = d < createdOn
            const isDone = done.has(d)
            return (
              <span
                key={d}
                onPointerEnter={() => setSelected(d)}
                onPointerDown={() => setSelected(d)}
                className={`aspect-square rounded-[3px] ${
                  future || before
                    ? 'bg-transparent'
                    : isDone
                      ? ''
                      : 'bg-slate-100 dark:bg-slate-800'
                } ${selected === d ? 'ring-2 ring-slate-900 dark:ring-white' : ''}`}
                style={isDone ? { backgroundColor: color } : undefined}
              />
            )
          })}
        </div>
      </div>
      <p className="mt-2 h-4 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {selected ? `${formatShortDate(selected)} · ${done.has(selected) ? 'done' : selected > today ? 'upcoming' : 'not done'}` : `Last ${weeks} weeks · tap a day`}
      </p>
    </div>
  )
}
