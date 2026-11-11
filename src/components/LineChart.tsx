import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { fromDateKey } from '../lib/dates'
import { daysBetween } from '../lib/schedule'
import type { DateKey } from '../lib/types'

export interface ChartSeries {
  name: string
  /** A CSS colour, normally var(--series-1) / var(--series-2). */
  color: string
  points: { date: DateKey; value: number; detail?: string }[]
}

interface Props {
  series: ChartSeries[]
  unit: string
  /** Accessible description, e.g. "Deadlift: heaviest set per session". */
  label: string
  /** Force the y-axis to include these values (e.g. 0 and 10 for pain). */
  yDomain?: [number, number]
  reference?: { value: number; label: string }
  height?: number
}

const PAD = { top: 12, right: 14, bottom: 24, left: 34 }

const dayLabel = (d: DateKey) => fromDateKey(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  // Floor/ceil so the gridlines always enclose every point.
  const ticks: number[] = []
  const top = Math.ceil(max / step - 1e-9) * step
  for (let v = Math.floor(min / step + 1e-9) * step; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

/** Line chart over dates: 2px lines, ringed dots, hairline grid, crosshair tooltip, optional table. */
export function LineChart({ series, unit, label, yDomain, reference, height = 190 }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [hover, setHover] = useState<DateKey | null>(null)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort()
  if (dates.length === 0) return <p className="text-sm text-slate-500">Nothing logged yet.</p>

  const values = series.flatMap((s) => s.points.map((p) => p.value))
  let lo = Math.min(...values, ...(yDomain ? [yDomain[0]] : []), ...(reference ? [reference.value] : []))
  let hi = Math.max(...values, ...(yDomain ? [yDomain[1]] : []), ...(reference ? [reference.value] : []))
  if (lo === hi) {
    lo = lo - 1
    hi = hi + 1
  }
  const ticks = niceTicks(lo, hi)
  lo = Math.min(lo, ticks[0])
  hi = Math.max(hi, ticks[ticks.length - 1])

  const span = Math.max(1, daysBetween(dates[0], dates[dates.length - 1]))
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const x = (d: DateKey) => PAD.left + (dates.length === 1 ? plotW / 2 : (daysBetween(dates[0], d) / span) * plotW)
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH

  function onPointer(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left + PAD.left
    let nearest = dates[0]
    for (const d of dates) if (Math.abs(x(d) - px) < Math.abs(x(nearest) - px)) nearest = d
    setHover(nearest)
  }

  const hoverX = hover ? x(hover) : 0
  const tooltipLeft = Math.min(Math.max(hoverX - 70, 0), width - 140)

  return (
    <div>
      {(series.length > 1 || reference) && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300" aria-label="Legend">
          {series.length > 1 &&
            series.map((s) => (
              <li key={s.name} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
                {s.name}
              </li>
            ))}
          {/* The reference line is named here rather than on the plot, where it would collide with points. */}
          {reference && (
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-px w-4" style={{ background: 'var(--chart-reference)' }} />
              {reference.label}
            </li>
          )}
        </ul>
      )}
      <div ref={wrap} className="relative select-none">
        <svg width={width} height={height} role="img" aria-label={label} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--chart-text)" className="tabular-nums">
                {t}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={height - 6} fontSize={11} fill="var(--chart-text)">
            {dayLabel(dates[0])}
          </text>
          {dates.length > 1 && (
            <text x={width - PAD.right} y={height - 6} fontSize={11} fill="var(--chart-text)" textAnchor="end">
              {dayLabel(dates[dates.length - 1])}
            </text>
          )}

          {reference && (
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke="var(--chart-reference)"
              strokeWidth={1}
            />
          )}

          {hover && <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--chart-crosshair)" strokeWidth={1} />}

          {series.map((s) => {
            const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date))
            const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ')
            return (
              <g key={s.name}>
                {pts.length > 1 && <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                {pts.map((p) => (
                  <circle
                    key={p.date}
                    cx={x(p.date)}
                    cy={y(p.value)}
                    r={p.date === hover ? 5.5 : 4}
                    fill={s.color}
                    stroke="var(--chart-surface)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )
          })}

          {/* Hit area: the whole plot, so the pointer only needs to be near a date. */}
          <rect
            x={PAD.left}
            y={0}
            width={plotW}
            height={height}
            fill="transparent"
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
          />
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute top-0 w-[140px] rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
            style={{ left: tooltipLeft }}
          >
            <p className="mb-1 text-slate-500 dark:text-slate-400">{dayLabel(hover)}</p>
            {series.map((s) => {
              const p = s.points.find((pt) => pt.date === hover)
              return (
                <p key={s.name} className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-3 shrink-0 rounded" style={{ background: s.color }} />
                  <strong className="text-slate-900 tabular-nums dark:text-white">{p ? (p.detail ?? `${p.value} ${unit}`) : '–'}</strong>
                  {series.length > 1 && <span className="truncate text-slate-500 dark:text-slate-400">{s.name}</span>}
                </p>
              )
            })}
          </div>
        )}
      </div>

      <button type="button" onClick={() => setShowTable((v) => !v)} className="mt-1 text-xs font-medium text-slate-500 underline">
        {showTable ? 'Hide table' : 'Show as table'}
      </button>
      {showTable && (
        <table className="mt-2 w-full text-left text-sm tabular-nums">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 font-medium">Date</th>
              {series.map((s) => (
                <th key={s.name} className="py-1 font-medium">
                  {series.length > 1 ? s.name : unit}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...dates].reverse().map((d) => (
              <tr key={d} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1">{dayLabel(d)}</td>
                {series.map((s) => {
                  const p = s.points.find((pt) => pt.date === d)
                  return (
                    <td key={s.name} className="py-1">
                      {p ? (p.detail ?? p.value) : '–'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
