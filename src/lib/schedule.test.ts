import { describe, expect, it } from 'vitest'
import { addDays, toDateKey, weekRange } from './dates'
import { isProgramSession, sessionTitle } from './program'
import { BASELINE_DATE, PROGRAM_WEEKS, SEASON_START } from './program'
import {
  daysBetween,
  deloadSets,
  planSession,
  plannedSessionKey,
  programWeek,
  programWeekRange,
  programWeekStartOnOrBefore,
  taperSets,
  weekDates,
  weekInfo,
  weekLabel,
} from './schedule'

describe('dates', () => {
  it('builds local date keys, not UTC', () => {
    // 23:30 local on 11 Nov must still be the 11th whatever the time zone.
    expect(toDateKey(new Date(2026, 10, 11, 23, 30))).toBe('2026-11-11')
  })
  it('calendar weeks (habits) run Monday to Sunday', () => {
    expect(weekRange('2026-11-11')).toEqual({ start: '2026-11-09', end: '2026-11-15' })
    expect(weekRange('2026-11-16').start).toBe('2026-11-16')
  })
  it('counts days across month and daylight-saving boundaries', () => {
    expect(daysBetween('2026-10-24', '2026-11-02')).toBe(9)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('season calendar (from the PDF)', () => {
  const start = SEASON_START // Sunday 22 Nov 2026
  const weekOf = (d: string) => weekInfo(programWeek(start, d))

  it('starts Sunday 22 Nov 2026 (baseline tests the day before) and runs 25 weeks', () => {
    expect(start).toBe('2026-11-22')
    expect(BASELINE_DATE).toBe('2026-11-21')
    expect(programWeek(start, BASELINE_DATE)).toBe(0)
    expect(PROGRAM_WEEKS).toBe(25)
    expect(weekDates(start, 25).end).toBe('2027-05-15') // taper ends the day before ~16 May
  })
  it('puts each block on the dates in the PDF', () => {
    const blockStart = (b: number | 'taper') => {
      for (let wk = 1; wk <= PROGRAM_WEEKS; wk++) if (weekInfo(wk).info.block === b) return weekDates(start, wk).start
    }
    const blockEnd = (b: number | 'taper') => {
      let last = ''
      for (let wk = 1; wk <= PROGRAM_WEEKS; wk++) if (weekInfo(wk).info.block === b) last = weekDates(start, wk).end
      return last
    }
    const blocks = [1, 2, 3, 4, 5, 6, 'taper'] as const
    expect(blocks.map((b) => `${blockStart(b)}..${blockEnd(b)}`)).toEqual([
      '2026-11-22..2026-12-19',
      '2026-12-20..2027-01-16',
      '2027-01-17..2027-02-13',
      '2027-02-14..2027-03-13',
      '2027-03-14..2027-04-10',
      '2027-04-11..2027-05-01',
      '2027-05-02..2027-05-15',
    ])
  })
  it('has deload + test weeks on the PDF dates and nowhere else', () => {
    const deloads: string[] = []
    for (let wk = 1; wk <= PROGRAM_WEEKS; wk++) if (weekInfo(wk).deload) deloads.push(weekDates(start, wk).start)
    expect(deloads).toEqual(['2026-12-13', '2027-01-10', '2027-03-07', '2027-04-04'])
    expect(weekOf('2026-12-13').test).toBe(true)
  })
  it('marks Tết week (7–13 Feb, end of block 3) as home-only, and the taper', () => {
    expect(weekOf('2027-02-07')).toMatchObject({ home: true, block: 3, weekInBlock: 4 })
    expect(weekOf('2027-02-13').home).toBe(true)
    expect(weekOf('2027-02-14')).toMatchObject({ home: false, block: 4 })
    expect(weekOf('2027-05-02').taper).toBe(true)
    expect(weekOf('2027-05-02').block).toBe(6) // taper uses block 6 prescriptions
    expect(weekOf('2027-04-25').info.weeks).toBe(3) // peak block is 3 weeks
  })
  it('today (Wed 25 Nov) is block 1 week 1', () => {
    expect(weekOf('2026-11-25')).toMatchObject({ week: 1, block: 1, weekInBlock: 1, deload: false })
  })
  it('labels weeks before the season', () => {
    expect(weekLabel(3)).toBe('Week 3')
    expect(weekLabel(0)).toBe('Baseline week')
    expect(weekLabel(-2)).toBe('Pre-season')
  })
  it('clamps weeks outside the season', () => {
    expect(weekInfo(0).week).toBe(1)
    expect(weekInfo(40).week).toBe(25)
  })
  it('program weeks run Sunday to Saturday', () => {
    expect(programWeekRange(start, '2026-11-25')).toEqual({ start: '2026-11-22', end: '2026-11-28' })
    expect(programWeekStartOnOrBefore('2026-11-28')).toBe('2026-11-22')
  })
})

describe('the week', () => {
  it('has gym on Sunday, Monday and Tuesday only', () => {
    // 15 Nov 2026 is a Sunday
    const keys = [15, 16, 17, 18, 19, 20, 21].map((d) => plannedSessionKey(`2026-11-${d}`))
    expect(keys).toEqual(['lower', 'upper', 'resilience', null, null, null, null])
  })
  it('names current, old-plan and custom sessions', () => {
    expect(sessionTitle('lower')).toBe('Lower A — jumps and strength')
    expect(sessionTitle('resilience')).toBe('Power and resilience')
    expect(sessionTitle('mon')).toBe('Lower A — strength (old plan)')
    expect(sessionTitle('custom')).toBe('Custom workout')
    expect(isProgramSession('upper')).toBe(true)
    expect(isProgramSession('wed')).toBe(false)
  })
})

// Week numbers used below: 2 = block 1, 6 = block 2, 10 = block 3, 14 = block 4, 19 = block 5,
// 22 = block 6, 24 = taper; deloads 4, 8, 16, 20; Tết week 12.
describe('Sunday — Lower A', () => {
  const plan = (w: number, scrimmage = false) => planSession('lower', w, { scrimmage })
  const byId = (w: number, id: string, scrimmage = false) => plan(w, scrimmage).find((p) => p.exercise.id === id)

  it('back squat replaces the deadlift, with the PDF’s sets per block', () => {
    expect(byId(2, 'deadlift')).toBeUndefined()
    expect(byId(2, 'back-squat')).toMatchObject({ label: 'D', rx: { sets: 4, reps: 6 } }) // B1 4 × 6–8
    expect(byId(6, 'back-squat')?.rx).toMatchObject({ sets: 4, reps: 5 }) // B2 4 × 5–6
    expect(byId(10, 'back-squat')?.rx).toMatchObject({ sets: 6, reps: 3 }) // B3 6 × 3
    expect(byId(14, 'back-squat')?.rx).toMatchObject({ sets: 5, reps: 3 }) // B4 5 × 3
    expect(byId(19, 'back-squat')?.rx.repsBySet).toEqual([5, 4, 3, 5]) // B5 5, 4, 3, then 1 × 5
    expect(byId(22, 'back-squat')?.rx).toMatchObject({ sets: 3, reps: 3 }) // B6 3 × 3
  })
  it('isometric E: wall sit in block 1, pin squat push in blocks 2–5, dropped in block 6', () => {
    expect(byId(2, 'wall-sit')?.label).toBe('E')
    expect(byId(6, 'pin-squat-push')?.label).toBe('E')
    expect(byId(19, 'pin-squat-push')?.rx.sets).toBe(3)
    expect(plan(22).some((p) => p.label === 'E')).toBe(false)
  })
  it('calf raises H change with the block but keep the letter', () => {
    expect(byId(2, 'sl-calf-raise-db')).toMatchObject({ label: 'H', rx: { sets: 4 } })
    expect(byId(10, 'calf-raise-2up-1down')?.label).toBe('H')
    expect(byId(14, 'calf-raise-bouncing-heavy')?.rx.repsBySet).toEqual([6, 6, 8, 8, 8])
    expect(byId(19, 'calf-raise-slow')?.label).toBe('H')
  })
  it('keeps the program sheet letters A–H', () => {
    expect(plan(2).map((p) => p.label)).toEqual(['Warm-up', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
    expect(byId(6, 'drop-landing')?.label).toBe('C') // block 2 still lands
    expect(byId(10, 'drop-jump')?.label).toBe('C') // blocks 3–4
    expect(byId(19, 'depth-jump')?.label).toBe('C')
  })
  it('block 4 split squat and RDL are the slow-lowering / drop versions', () => {
    expect(byId(14, 'split-squat-thp')?.rx.text).toMatch(/Slow-lowering/)
    expect(byId(14, 'rdl')?.rx).toMatchObject({ sets: 2 })
  })
  it('approach jumps go up to 6 × 2 in block 6', () => {
    expect(byId(19, 'approach-jump')?.rx.sets).toBe(5)
    expect(byId(22, 'approach-jump')?.rx.sets).toBe(6)
  })
  it('scrimmage: drops A–C and takes one set off D–H', () => {
    expect(plan(2, true).map((x) => x.label)).toEqual(['Warm-up', 'D', 'E', 'F', 'G', 'H'])
    expect(byId(2, 'back-squat', true)?.rx.sets).toBe(3)
  })
  it('deload: fewer sets, no depth jumps, tests on the Sunday', () => {
    expect(deloadSets(5)).toBe(3)
    expect(byId(16, 'drop-jump')).toBeUndefined() // block 4 deload
    expect(byId(20, 'depth-jump')).toBeUndefined() // block 5 deload
    expect(byId(4, 'drop-landing')?.rx.sets).toBe(2) // block 1 deload keeps landings, 3 -> 2
    expect(plan(4).some((p) => p.isTest)).toBe(true)
    expect(plan(3).some((p) => p.isTest)).toBe(false)
    expect(planSession('upper', 4).some((p) => p.isTest)).toBe(false)
  })
  it('taper: half the sets', () => {
    expect(taperSets(6)).toBe(3)
    expect(taperSets(3)).toBe(2)
    expect(byId(24, 'approach-jump')?.rx.sets).toBe(3) // 6 × 2 -> 3
  })
})

describe('Monday — Upper + rotation', () => {
  it('is unchanged: A–J plus an unlettered finisher', () => {
    const p = planSession('upper', 2)
    expect(p.map((x) => x.label)).toEqual(['Warm-up', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'Finisher', 'Finisher', 'Finisher'])
    expect(p.find((x) => x.exercise.id === 'db-snatch')?.perSide).toBe(true)
  })
})

describe('Tuesday — Power and resilience', () => {
  const plan = (w: number) => planSession('resilience', w)
  const byId = (w: number, id: string) => plan(w).find((p) => p.exercise.id === id)
  it('block 1: no clean pull yet, so it starts at B (hang power clean)', () => {
    expect(byId(2, 'clean-pull')).toBeUndefined()
    expect(byId(2, 'hang-power-clean')).toMatchObject({ label: 'B', rx: { sets: 4, reps: 3 } })
    expect(byId(6, 'clean-pull')).toMatchObject({ label: 'A', rx: { sets: 4, reps: 3 } })
  })
  it('block 6 is a recovery day: clean pull and jump squat dropped', () => {
    expect(byId(22, 'clean-pull')).toBeUndefined()
    expect(byId(22, 'barbell-jump-squat')).toBeUndefined()
    expect(byId(19, 'barbell-jump-squat')?.rx.text).toBe('4 × 3, fast')
  })
  it('Nordics: 2 × 3 in weeks 1–2, then 3 × 5; 3 × 6 in block 3', () => {
    expect(byId(1, 'nordic-curl')?.rx).toMatchObject({ sets: 2, reps: 3 })
    expect(byId(3, 'nordic-curl')?.rx).toMatchObject({ sets: 3, reps: 5 })
    expect(byId(10, 'nordic-curl')?.rx).toMatchObject({ sets: 3, reps: 6 })
  })
  it('letters A–I, then the hip flexor, upper finisher and optional groups', () => {
    const labels = plan(6).map((p) => p.label)
    expect(labels.slice(0, 10)).toEqual(['Warm-up', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])
    expect(labels.filter((l) => l === 'Hip flexors')).toHaveLength(3)
    expect(labels.filter((l) => l === 'Upper finisher')).toHaveLength(6)
    expect(labels.at(-1)).toBe('Optional')
  })
  it('dropped exercises are gone from Tuesday', () => {
    const ids = plan(2).map((p) => p.exercise.id)
    for (const gone of ['heel-elevated-goblet-squat', 'tibialis-raise-loaded', 'seated-calf-raise', 'arm-swing-drill', 'backward-running']) {
      expect(ids).not.toContain(gone)
    }
  })
})
