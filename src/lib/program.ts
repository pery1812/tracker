/**
 * The "Bulletproof Volleyball Program" (version 4, season plan): baseline tests on Sat 21 Nov 2026,
 * then five 4-week blocks, a 3-week peak block and a two-week taper from Sunday 22 Nov 2026 to the
 * tournament around 16 May 2027. Three gym days: Sunday lower,
 * Monday upper, Tuesday power and resilience, around volleyball and football.
 *
 * This is static plan content, not user data, so it lives in code rather than the database.
 * Logged sets refer to exercises by `id`. NEVER change an existing id: past logs would lose their
 * exercise. When a movement changes between blocks (e.g. wall sit -> pin squat push) it is a
 * separate exercise with its own id, so "last time" and progress charts compare like with like.
 * Exercises dropped from the plan stay in RETIRED_EXERCISES so old logs still show.
 */
import type { DateKey, Field, LegacySessionKey, SessionKey, SessionKind } from './types'

/** Training block 1–6. The taper uses block 6 prescriptions at half the sets. */
export type Block = 1 | 2 | 3 | 4 | 5 | 6
export type { Field, SessionKey }

export const FIELD_UNITS: Record<Field, string> = {
  kg: 'kg',
  reps: 'reps',
  sec: 's',
  cm: 'cm',
  pain: '/10',
}

/** The prescription for one block. */
export interface Rx {
  sets: number
  /** Target reps per set (used to pre-fill the log). */
  reps?: number
  /** Different target reps per set, e.g. back squat 5, 4, 3, then 5 fast. Overrides `reps`. */
  repsBySet?: number[]
  /** Target seconds per set (holds, isometrics). */
  seconds?: number
  /** Suggested starting weight. */
  kg?: number
  /** Exactly as written in the program, shown to you. */
  text: string
  /** Log left and right separately, left first. Overrides the exercise default for this block. */
  perSide?: boolean
  /** Left out of deload weeks. */
  skipOnDeload?: boolean
  /** A gentler start for the first weeks of the program, e.g. Nordics 2 × 3 in weeks 1–2. */
  easierThroughWeek?: { week: number; sets: number; reps: number }
}

export interface Exercise {
  id: string
  name: string
  fields: Field[]
  /** Log left and right separately, left first. */
  perSide?: boolean
  /** Coaching cue from the program. */
  cue?: string
  /** Warm-ups are shown first and just ticked off. */
  warmup?: boolean
  /** Created by you in the app (id 'custom-<uuid>'), not part of the program. */
  custom?: boolean
  /** Prescription per block; no entry = not done in that block. */
  rx: Partial<Record<Block, Rx>>
}

/** An exercise as it appears in a session. */
export interface SessionItem {
  exercise: Exercise
  /** Done straight after the previous exercise, same letter numbered on ("I", then "I2"). */
  continuesPrevious?: boolean
  /** Replaces the previous exercise in other blocks (wall sit -> pin squat push): same letter. */
  phaseAlternative?: boolean
  /** Unlettered group on the program sheet, e.g. "Finisher" or "Hip flexors". */
  group?: string
  /** Dropped on a scrimmage Sunday (the scrimmage is the jump session). */
  jumpBlock?: boolean
  /** One set fewer on a scrimmage Sunday. */
  fewerOnScrimmage?: boolean
}

export interface SessionPlan {
  key: SessionKey
  /** JS weekday: 0 = Sunday, 1 = Monday, 2 = Tuesday. */
  weekday: number
  title: string
  goal: string
  minutes: string
  note?: string
  items: SessionItem[]
}

// =====================================================================================
// The season
// =====================================================================================

/** Sunday of week 1 (block 1 starts 22 Nov 2026). The app's start-date setting defaults to this. */
export const SEASON_START: DateKey = '2026-11-22'
/** Baseline tests, the day before week 1: all tests, no session. */
export const BASELINE_DATE: DateKey = '2026-11-21'
export const TOURNAMENT_LABEL = 'Tournament around 16 May 2027'
/** Program weeks start on Sunday (the first gym day). */
export const PROGRAM_WEEK_STARTS_ON = 0

export interface BlockInfo {
  block: Block | 'taper'
  name: string
  focus: string
  weeks: number
  /** Week within the block (1-based) that is the deload + test week, if any. */
  deloadWeek?: number
  /** Week within the block with no gym: home routine only (Tết). */
  homeWeek?: number
}

/**
 * Block lengths in weeks. If the tournament date moves, change block 6's length:
 * the last two weeks are always the taper.
 */
export const SEASON: BlockInfo[] = [
  { block: 1, name: 'Volume', focus: 'Higher reps, technique, ATG knee and ankle work, learn the hang clean', weeks: 4, deloadWeek: 4 },
  { block: 2, name: 'Intensify', focus: 'Clean pulls and hang cleans, squats in sets of 5–6, contrast jumps', weeks: 4, deloadWeek: 4 },
  { block: 3, name: 'Strength', focus: 'Heaviest squats (sets of 3), heavy clean pulls, eccentric accessories', weeks: 4, homeWeek: 4 },
  { block: 4, name: 'Power', focus: 'Heavy hang cleans, slow-lowering split squats, elastic accessories', weeks: 4, deloadWeek: 4 },
  { block: 5, name: 'Speed', focus: 'Light fast cleans, fast squats, more depth jumps, low plyos', weeks: 4, deloadWeek: 4 },
  { block: 6, name: 'Peak', focus: 'Most approach and depth jumps, lighter lifting, easy Tuesdays', weeks: 3 },
  { block: 'taper', name: 'Taper', focus: 'Volume cut by half, max-effort jumps only, stay fresh', weeks: 2 },
]

export const PROGRAM_WEEKS = SEASON.reduce((n, b) => n + b.weeks, 0) // 25

export const DELOAD_NOTE = 'Deload week: about 40% fewer sets, same weights, no depth jumps. Test on Sunday.'
export const HOME_WEEK_NOTE = 'Tết week: no gym, home routine only (the daily joint routine).'
export const TAPER_NOTE = 'Taper: half the sets, max-effort jumps only, stay fresh for the tournament.'

export const SCRIMMAGE_NOTE =
  'Scrimmage Sunday: the scrimmage is your jump session, so pogos, approach jumps and depth landings are dropped and D–H have one set fewer. Do them before the scrimmage if there are a few hours between, otherwise after. Legs dead afterwards? Move D–H to Tuesday and skip Tuesday’s session.'

// ---------- prescription helpers ----------

/** Same prescription in every block. */
const all = (rx: Rx): Partial<Record<Block, Rx>> => ({ 1: rx, 2: rx, 3: rx, 4: rx, 5: rx, 6: rx })

/** The program sheet's three columns: blocks 1–2, 3–4 and 5–6. `null` = not done in those blocks. */
function cols(b12: Rx | null, b34: Rx | null, b56: Rx | null): Partial<Record<Block, Rx>> {
  const out: Partial<Record<Block, Rx>> = {}
  if (b12) out[1] = out[2] = b12
  if (b34) out[3] = out[4] = b34
  if (b56) out[5] = out[6] = b56
  return out
}

// =====================================================================================
// Exercise library. Ids are permanent.
// =====================================================================================

const EX = {
  // ---------- warm-ups ----------
  jointRoutineSunday: {
    id: 'joint-routine-askips',
    name: 'Daily joint routine + band ankle work + A-skips, 2 × 20 m + ATG split squat, 2 × 8 each, light',
    fields: [],
    warmup: true,
    cue: 'The ATG split squat stays as knee-friendly range work. If the knee is sore, stop the Patrick step at a shallower depth — don’t skip it.',
    rx: all({ sets: 1, text: '15 min' }),
  },
  jointRoutineUpper: {
    id: 'joint-routine-upper',
    name: 'Daily joint routine + arm circles, light DB Y-T raises',
    fields: [],
    warmup: true,
    rx: all({ sets: 1, text: '15 min' }),
  },
  jointRoutineTuesday: {
    id: 'joint-routine',
    name: 'Daily joint routine + band ankle work + backward walking, 2 × 30 m',
    fields: [],
    warmup: true,
    cue: 'Backward walking 3 min · tibialis raise 1 × 20–25 · calf raise straight knee 1 × 15 each · calf raise bent knee 1 × 15 each · single-leg balance 2 × 30 s each · Patrick step 1 × 15 each · couch stretch + 90/90 switches. Left side first.',
    rx: all({ sets: 1, text: '15 min' }),
  },

  // ---------- Sunday: jumps ----------
  pogoHops: {
    id: 'pogo-hops',
    name: 'Pogo hops',
    fields: ['reps'],
    cue: 'Stiff ankles, short ground contact. Left first. Only if the knee rule passed this week.',
    rx: cols(
      { sets: 3, reps: 10, text: '3 × 10 both legs, small → 3 × 15' },
      { sets: 3, reps: 15, text: '3 × 15 both legs + 2 × 8 each leg' },
      { sets: 3, reps: 10, perSide: true, text: '3 × 10 each leg, fast' },
    ),
  },
  approachJump: {
    id: 'approach-jump',
    name: 'Approach jump',
    fields: ['reps', 'cm'],
    cue: 'On the indoor court if it’s free. Long fast penultimate step, plant heel first, full arm swing. Log your reach in cm if you mark it.',
    rx: {
      ...cols(
        { sets: 3, reps: 3, text: '3 × 3, technique → 4 × 3, max' },
        { sets: 4, reps: 3, text: '4 × 3, max' },
        { sets: 5, reps: 2, text: '5 × 2, max, mark your reach' },
      ),
      6: { sets: 6, reps: 2, text: 'Up to 6 × 2, max, mark your reach' },
    },
  },
  dropLanding: {
    id: 'drop-landing',
    name: 'Drop landing',
    fields: ['reps', 'cm'],
    cue: 'Step off a bench or stacked plates; don’t jump off. Log the drop height.',
    rx: cols({ sets: 3, reps: 4, text: 'From 30 cm, 3 × 4, stick' }, null, null),
  },
  dropJump: {
    id: 'drop-jump',
    name: 'Drop then jump',
    fields: ['reps', 'cm'],
    cue: 'Step off, don’t jump off. Log the drop height.',
    rx: cols(null, { sets: 3, reps: 4, skipOnDeload: true, text: 'From 30 cm, 3 × 4' }, null),
  },
  depthJump: {
    id: 'depth-jump',
    name: 'Depth jump',
    fields: ['reps', 'cm'],
    cue: 'Step off from 30–45 cm and spend as little time on the ground as possible. Log the drop height.',
    rx: cols(null, null, { sets: 4, reps: 3, skipOnDeload: true, text: 'From 30–45 cm, 4 × 3, minimal ground time' }),
  },

  // ---------- Sunday: strength ----------
  backSquat: {
    id: 'back-squat',
    name: 'Back squat, high bar',
    fields: ['kg', 'reps'],
    cue: 'Safety pins just below your bottom position. From block 2: after each set rest 90 s, then 2 max countermovement jumps. Knee flares? Squat only to a box or bench at a pain-free depth that week.',
    rx: {
      1: { sets: 4, reps: 6, text: '4 × 6–8 at RPE 7' },
      2: { sets: 4, reps: 5, text: '4 × 5–6 at RPE 8, then 2 jumps after each set' },
      3: { sets: 6, reps: 3, text: '6 × 3, heavy (RPE 8–9), then 2 jumps after each set' },
      4: { sets: 5, reps: 3, text: '5 × 3, heavy, then 2 jumps after each set' },
      5: { sets: 4, repsBySet: [5, 4, 3, 5], text: 'Sets of 5, 4, 3 building to about 85%, then 1 × 5 fast at 65–70%' },
      6: { sets: 3, reps: 3, text: '3 × 3 at 75–80%, fast' },
    },
  },
  wallSit: {
    id: 'wall-sit',
    name: 'Isometric: wall sit at 60–70° knee bend',
    fields: ['sec'],
    cue: 'Isometric holds often ease tendon pain for a few hours. If the knee flares, do wall sits instead of pin pushes.',
    rx: { 1: { sets: 4, seconds: 45, text: '4 × 45 s' } },
  },
  pinSquatPush: {
    id: 'pin-squat-push',
    name: 'Isometric: pin squat push',
    fields: ['sec', 'kg'],
    cue: 'A bar loaded heavier than you can lift rests on the safety pins at quarter-squat height; push up as hard as you can.',
    rx: {
      2: { sets: 4, seconds: 5, text: '4 × 5 s' },
      3: { sets: 4, seconds: 5, text: '4 × 5 s max effort' },
      4: { sets: 4, seconds: 5, text: '4 × 5 s max effort' },
      5: { sets: 3, seconds: 5, text: '3 × 5 s' },
    },
  },
  splitSquatThp: {
    id: 'split-squat-thp',
    name: 'Split squat, THP style (barbell or heavy DBs)',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Front foot out in front, knee just past the toes, back thigh about parallel at the bottom. Left first. Knee flares? Reverse lunge to a shorter range that week.',
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8 each' },
      2: { sets: 3, reps: 6, text: '3 × 6 each, heavier' },
      3: { sets: 4, reps: 5, text: '4 × 4–5 each, heavy' },
      4: { sets: 3, reps: 3, text: 'Slow-lowering split squat, 3 × 3 each, heavier than you can lift, hands on the rack to help you up' },
      5: { sets: 3, reps: 5, text: '3 × 5 each, moderate, fast up' },
      6: { sets: 3, reps: 5, text: '3 × 5 each, moderate, fast up' },
    },
  },
  rdl: {
    id: 'rdl',
    name: 'Romanian deadlift',
    fields: ['kg', 'reps'],
    cue: 'Barbell. Stop when your hamstrings are fully stretched.',
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8' },
      2: { sets: 3, reps: 6, text: '3 × 6, heavier' },
      3: { sets: 3, reps: 5, text: '3 × 5, heavy' },
      4: { sets: 2, reps: 6, text: 'Drop RDL, 2 × 5–6 (drop fast, stand up explosively)' },
      5: { sets: 3, reps: 6, text: '3 × 6, slow, moderate' },
      6: { sets: 3, reps: 6, text: '3 × 6, slow, moderate' },
    },
  },
  slCalfRaiseDb: {
    id: 'sl-calf-raise-db',
    name: 'Calf raises: single-leg, straight knee, holding a DB',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'On a plate or the box edge, full range. Left first; right does the same reps.',
    rx: cols({ sets: 4, reps: 12, text: '4 × 10–12 each' }, null, null),
  },
  calfRaise2Up1Down: {
    id: 'calf-raise-2up-1down',
    name: 'Calf raises: 2-up-1-down',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Rise on two legs, lower on one over 3 s. On a plate or the box edge, full range.',
    rx: { 3: { sets: 4, reps: 6, text: '4 × 6 each (rise on two legs, lower on one over 3 s)' } },
  },
  calfRaiseBouncing: {
    id: 'calf-raise-bouncing-heavy',
    name: 'Calf raises: bouncing, then heavy',
    fields: ['kg', 'reps'],
    cue: 'Bouncing calf raises first, then heavy sets.',
    rx: { 4: { sets: 5, repsBySet: [6, 6, 8, 8, 8], text: 'Bouncing calf raises 2 × 6, then heavy 3 × 8' } },
  },
  calfRaiseSlow: {
    id: 'calf-raise-slow',
    name: 'Calf raises, slow',
    fields: ['kg', 'reps'],
    cue: 'On a plate or the box edge, full range.',
    rx: cols(null, null, { sets: 3, reps: 10, text: '3 × 10, slow' }),
  },

  // ---------- Monday: upper, rotation, arm swing ----------
  landminePunch: {
    id: 'landmine-rotational-punch',
    name: 'Landmine rotational punch',
    fields: ['reps'],
    perSide: true,
    cue: 'Stand side-on, bar end at your back hip in both hands. Drive the back hip through and punch the bar up and out, finishing on the ball of your back foot. Light: empty bar or one small plate. Every rep as fast as possible.',
    rx: cols(
      { sets: 3, reps: 5, text: '3 × 5 each side' },
      { sets: 4, reps: 4, text: '4 × 4 each side' },
      { sets: 5, reps: 3, text: '5 × 3 each side, max speed' },
    ),
  },
  dbSnatch: {
    id: 'db-snatch',
    name: 'One-arm dumbbell snatch',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Dip and drive from your legs and hips, let the dumbbell float up close to your body, and punch it overhead in one move. Moderate weight; stop if the speed drops.',
    rx: cols(
      { sets: 3, reps: 4, text: '3 × 4 each arm' },
      { sets: 4, reps: 3, text: '4 × 3 each arm' },
      { sets: 4, reps: 3, text: '4 × 3 each arm, heavier' },
    ),
  },
  pullupOrPullover: {
    id: 'pullup-or-pullover',
    name: 'Pull-up, or DB pullover on a bench',
    fields: ['kg', 'reps'],
    cue: 'Pull-ups on the squat rack’s bar if it has one. Pullover: one DB in both hands, lower it behind your head until your lats stretch. Log 0 kg for bodyweight pull-ups.',
    rx: cols(
      { sets: 3, reps: 8, text: '3 × 8' },
      { sets: 4, reps: 5, text: '4 × 5 (pullover 4 × 8)' },
      { sets: 3, reps: 5, text: '3 × 4–5 (pullover 3 × 8)' },
    ),
  },
  landminePress: {
    id: 'landmine-press',
    name: 'Half-kneeling landmine press',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Kneel on the side of the pressing arm, press up and slightly forward. Squeeze the glute of the down knee so your lower back doesn’t arch.',
    rx: cols(
      { sets: 3, reps: 8, text: '3 × 8 each' },
      { sets: 4, reps: 6, text: '4 × 6 each' },
      { sets: 3, reps: 5, text: '3 × 5 each' },
    ),
  },
  dbBench: {
    id: 'db-bench',
    name: 'Dumbbell bench press',
    fields: ['kg', 'reps'],
    rx: cols(
      { sets: 3, reps: 8, text: '3 × 8' },
      { sets: 4, reps: 5, text: '4 × 5' },
      { sets: 3, reps: 5, text: '3 × 5, then 3 clap or fast push-ups' },
    ),
  },
  dbRow: {
    id: 'db-row',
    name: 'Chest-supported DB row, or barbell bent-over row',
    fields: ['kg', 'reps'],
    cue: 'Chest on an incline bench if there is one.',
    rx: cols({ sets: 3, reps: 10, text: '3 × 10' }, { sets: 3, reps: 8, text: '3 × 8' }, { sets: 3, reps: 8, text: '3 × 8' }),
  },
  landmineRotation: {
    id: 'landmine-rotation',
    name: 'Landmine rotation (rainbow)',
    fields: ['kg', 'reps'],
    cue: 'Bar end at arm’s length overhead, swing it down to one hip, then the other, turning your hips and pivoting your back foot. Arms stay long; the hips lead, like the spike.',
    rx: cols(
      { sets: 3, reps: 8, text: '3 × 8 each side' },
      { sets: 3, reps: 6, text: '3 × 6, faster' },
      { sets: 3, reps: 6, text: '3 × 6, max speed' },
    ),
  },
  externalRotation: {
    id: 'external-rotation',
    name: 'Side-lying DB external rotation',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: '2–5 kg. Elbow pinned to your side, slow lowering. Hitting arm especially.',
    rx: cols({ sets: 3, reps: 12, text: '3 × 12–15' }, { sets: 3, reps: 12, text: '3 × 12' }, { sets: 3, reps: 12, text: '3 × 12' }),
  },
  proneYT: {
    id: 'prone-yt-raise',
    name: 'Prone Y and T raise, light DBs',
    fields: ['kg', 'reps'],
    cue: 'Face down on an incline bench. Upper back and rear shoulder.',
    rx: all({ sets: 2, reps: 12, text: '2 × 12 each' }),
  },
  plankPullThrough: {
    id: 'plank-pull-through',
    name: 'Plank DB pull-through',
    fields: ['reps'],
    cue: 'In a push-up plank, drag a DB under your body without letting the hips twist. Pallof press instead if the cable is free.',
    rx: cols(
      { sets: 3, reps: 8, text: '3 × 8 each side' },
      { sets: 3, reps: 10, text: '3 × 10 each' },
      { sets: 3, reps: 10, text: '3 × 10 each' },
    ),
  },
  lateralRaise: {
    id: 'upper-lateral-raise',
    name: 'Lateral raise',
    fields: ['kg', 'reps'],
    cue: 'RPE 8. Keeps the muscle from your hypertrophy year.',
    rx: all({ sets: 3, reps: 15, text: '3 × 15, RPE 8' }),
  },
  curls: {
    id: 'upper-curls',
    name: 'Dumbbell curls',
    fields: ['kg', 'reps'],
    rx: all({ sets: 2, reps: 12, text: '2 × 12, RPE 8' }),
  },
  triceps: {
    id: 'upper-triceps',
    name: 'Overhead triceps extension',
    fields: ['kg', 'reps'],
    rx: all({ sets: 2, reps: 12, text: '2 × 12, RPE 8' }),
  },

  // ---------- Tuesday: power ----------
  cleanPull: {
    id: 'clean-pull',
    name: 'Clean pull',
    fields: ['kg', 'reps'],
    cue: 'From just above the knees, explode up onto your toes and shrug; no catch. Easier to learn than the clean, and it builds the same drive.',
    rx: {
      2: { sets: 4, reps: 3, text: '4 × 3 at about 90% of your hang clean' },
      3: { sets: 4, reps: 3, text: '4 × 3 at 105–110% of your hang clean' },
      4: { sets: 3, reps: 3, text: '3 × 3' },
    },
  },
  hangPowerClean: {
    id: 'hang-power-clean',
    name: 'Hang power clean',
    fields: ['kg', 'reps'],
    cue: 'Catch in a quarter squat. Film one set a week. Lower under control; don’t drop rubber plates.',
    rx: {
      1: { sets: 4, reps: 3, text: '4 × 3, light, technique' },
      2: { sets: 4, reps: 3, text: '4 × 3 at 75–85%' },
      3: { sets: 3, reps: 2, text: '3 × 2' },
      4: { sets: 5, reps: 2, text: '5 × 2, heavy' },
      5: { sets: 5, reps: 2, text: '5 × 2 at 60–70%, fast' },
      6: { sets: 3, reps: 2, text: '3 × 2, light' },
    },
  },
  jumpSquat: {
    id: 'barbell-jump-squat',
    name: 'Barbell jump squat',
    fields: ['kg', 'reps'],
    cue: 'Max height every rep, land softly, reset.',
    rx: {
      ...cols(
        { sets: 3, reps: 3, text: '3 × 3, empty bar → about 20% of your squat' },
        { sets: 4, reps: 3, text: '4 × 3, 20–30% of your squat' },
        null,
      ),
      5: { sets: 4, reps: 3, text: '4 × 3, fast' },
    },
  },

  // ---------- Tuesday: resilience ----------
  lineHopStick: {
    id: 'line-hop-stick',
    name: 'Lateral hop and stick: line hop → skater bound',
    fields: ['reps'],
    perSide: true,
    cue: 'Hold every landing for 2 s. Ankle maintenance.',
    rx: cols({ sets: 2, reps: 5, text: 'Line hop → skater bound and stick, 2 × 5 each' }, null, null),
  },
  skaterBoundStick: {
    id: 'skater-bound-stick',
    name: 'Lateral hop and stick: skater bound',
    fields: ['reps'],
    perSide: true,
    cue: 'Hold every landing for 2 s. Ankle maintenance.',
    rx: cols(null, { sets: 2, reps: 6, text: 'Skater bound and stick, 2 × 6 each, longer' }, { sets: 2, reps: 5, text: '2 × 5 each' }),
  },
  nordicCurl: {
    id: 'nordic-curl',
    name: 'Nordic hamstring curl, lowering only',
    fields: ['reps'],
    cue: 'Feet anchored by a partner, or under a heavily loaded barbell padded with a towel. Catch yourself with your hands early.',
    rx: {
      ...cols(
        { sets: 3, reps: 5, easierThroughWeek: { week: 2, sets: 2, reps: 3 }, text: 'Start at 2 × 3, build to 3 × 5' },
        null,
        { sets: 2, reps: 4, text: '2 × 4, maintenance' },
      ),
      3: { sets: 3, reps: 6, text: '3 × 6 (the eccentric block)' },
      4: { sets: 2, reps: 5, text: '2 × 5' },
    },
  },
  hipThrust: {
    id: 'barbell-hip-thrust',
    name: 'Barbell hip thrust',
    fields: ['kg', 'reps'],
    cue: 'Upper back on a bench, bar over your hips with a pad. Squeeze hard at the top.',
    rx: cols(
      { sets: 3, reps: 10, text: '3 × 8–10' },
      { sets: 4, reps: 6, text: '4 × 6, heavier' },
      { sets: 3, reps: 6, text: '3 × 6, fast up' },
    ),
  },
  reverseNordic: {
    id: 'reverse-nordic',
    name: 'Reverse Nordic',
    fields: ['reps'],
    cue: 'Kneel, lean back with a straight line from knees to head.',
    rx: cols(
      { sets: 2, reps: 8, text: '2 × 8, partial range' },
      { sets: 2, reps: 8, text: '2 × 8' },
      { sets: 2, reps: 8, text: '2 × 8, deeper' },
    ),
  },
  copenhagen: {
    id: 'copenhagen-plank',
    name: 'Copenhagen side plank',
    fields: ['sec'],
    perSide: true,
    cue: 'Inner thigh strength for football and landings.',
    rx: cols(
      { sets: 2, seconds: 20, text: '2 × 20 s each, knee version → 3 × 25 s' },
      { sets: 3, seconds: 20, text: '3 × 20 s each, full lever' },
      { sets: 2, seconds: 20, text: '2 × 20 s each' },
    ),
  },
  slCalfRaiseFailure: {
    id: 'sl-calf-raise-failure',
    name: 'Single-leg calf raise to failure',
    fields: ['reps'],
    perSide: true,
    cue: 'Log the reps; the left should keep up with the right.',
    rx: all({ sets: 1, text: '1 set each leg' }),
  },
  pikeLift: {
    id: 'seated-pike-lift',
    name: 'Seated pike lift (ATG psoas lift)',
    fields: ['reps'],
    cue: 'Sit with legs straight, hands beside your knees, lift both heels off the floor and hold 1 s. Bend your knees slightly if you can’t lift at first.',
    rx: all({ sets: 3, reps: 10, text: '3 × 10' }),
  },
  kneeRaise: {
    id: 'hanging-knee-raise',
    name: 'Hanging knee raise, or lying leg raise',
    fields: ['reps'],
    cue: 'Knees to chest, controlled. Hang from the squat rack’s bar if it has one.',
    rx: all({ sets: 3, reps: 12, text: '3 × 10–12' }),
  },
  standingMarch: {
    id: 'standing-march',
    name: 'Band or ankle-weight standing march',
    fields: ['reps'],
    perSide: true,
    cue: 'Stand tall, drive your knee above hip height. Left leg first.',
    rx: all({ sets: 2, reps: 10, text: '2 × 10 each' }),
  },
  inclineDbPress: {
    id: 'upper-incline-db-press',
    name: 'Incline dumbbell press',
    fields: ['kg', 'reps'],
    cue: 'Pair with the one-arm row: back to back, rest 60–90 s, stop 1–2 reps short of failure.',
    rx: all({ sets: 3, reps: 10, text: '3 × 8–12' }),
  },
  oneArmRow: {
    id: 'one-arm-db-row',
    name: 'One-arm dumbbell row',
    fields: ['kg', 'reps'],
    perSide: true,
    rx: all({ sets: 3, reps: 10, text: '3 × 8–12' }),
  },
  rearDeltFly: {
    id: 'rear-delt-fly',
    name: 'Bent-over rear delt fly',
    fields: ['kg', 'reps'],
    rx: all({ sets: 3, reps: 15, text: '3 × 15' }),
  },
  skullCrusher: {
    id: 'db-skull-crusher',
    name: 'Dumbbell skull crusher',
    fields: ['kg', 'reps'],
    rx: all({ sets: 2, reps: 12, text: '2 × 12' }),
  },
  jeffersonCurl: {
    id: 'jefferson-curl',
    name: 'Jefferson curl (optional extra)',
    fields: ['kg', 'reps'],
    cue: 'Only if you have time. Stand on the wooden box or a bench, roll down one vertebra at a time. Very light: this is for range.',
    rx: all({ sets: 2, reps: 8, text: '2 × 8, light — optional' }),
  },
} satisfies Record<string, Exercise>

/** Version 1/2 prescriptions mapped onto blocks (old phase 1 -> blocks 1–2, 2 -> 3–4, 3 -> 5–6). */
const phases = cols

/**
 * Exercises from earlier versions that the season plan dropped. Kept so old sessions, "last time"
 * and charts still show them, and so you can still add them to a session by hand.
 */
export const RETIRED_EXERCISES: Exercise[] = [
  {
    id: 'deadlift',
    name: 'Barbell deadlift from the floor',
    fields: ['kg', 'reps'],
    cue: 'Push the floor away rather than leaning back. (Replaced by the back squat in the season plan.)',
    rx: phases({ sets: 4, reps: 6, text: '4 × 6, RPE 7' }, { sets: 5, reps: 4, text: '5 × 4, RPE 8' }, { sets: 4, reps: 3, text: '4 × 3, RPE 8' }),
  },
  {
    id: 'overloaded-pull',
    name: 'Isometric: overloaded barbell pull',
    fields: ['sec', 'kg'],
    rx: phases(null, { sets: 4, seconds: 5, text: '4 × 5 s max effort' }, { sets: 3, seconds: 5, text: '3 × 5 s' }),
  },
  {
    id: 'atg-split-squat',
    name: 'ATG split squat',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Now part of the Sunday warm-up (2 × 8 each, light).',
    rx: phases({ sets: 3, reps: 8, kg: 0, text: '3 × 8 each' }, { sets: 3, reps: 6, text: '3 × 6 each' }, { sets: 3, reps: 5, text: '3 × 5 each' }),
  },
  {
    id: 'backward-running',
    name: 'Backward running, or backward walking on an inclined treadmill',
    fields: [],
    cue: 'Now part of the Tuesday warm-up.',
    rx: all({ sets: 4, text: '4 × 30–40 m' }),
  },
  {
    id: 'heel-elevated-goblet-squat',
    name: 'Heel-elevated goblet squat',
    fields: ['kg', 'reps'],
    rx: phases({ sets: 3, reps: 10, text: '3 × 10' }, { sets: 3, reps: 8, text: '3 × 8' }, { sets: 3, reps: 6, text: '3 × 6' }),
  },
  {
    id: 'tibialis-raise-loaded',
    name: 'Tibialis raise, loaded',
    fields: ['kg', 'reps'],
    cue: 'Tib raises are now in the daily routine.',
    rx: all({ sets: 3, reps: 15, text: '3 × 15' }),
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated calf raise',
    fields: ['kg', 'reps'],
    rx: phases({ sets: 3, reps: 15, text: '3 × 15' }, { sets: 3, reps: 12, text: '3 × 12' }, { sets: 3, reps: 10, text: '3 × 10' }),
  },
  {
    id: 'arm-swing-drill',
    name: 'Arm swing drill, no jump',
    fields: ['reps'],
    rx: all({ sets: 2, reps: 10, text: '2 × 10' }),
  },
  {
    id: 'box-jump',
    name: 'Box jump onto the wooden box, step down',
    fields: ['reps', 'cm'],
    cue: 'Land softly in the same position you take off. Step down, never jump down. Log the box height.',
    rx: phases({ sets: 4, reps: 3, text: '4 × 3, stick 2 s' }, { sets: 4, reps: 3, text: '4 × 3, max height' }, { sets: 3, reps: 3, text: '3 × 3' }),
  },
  {
    id: 'db-jump',
    name: 'Dumbbell jump',
    fields: ['kg', 'reps'],
    cue: 'Arms hang straight; jump as high as you can. Land softly, reset each rep.',
    rx: phases(null, { sets: 4, reps: 3, kg: 5, text: '4 × 3, light DBs (5–10 kg)' }, { sets: 4, reps: 3, text: '4 × 3, light, max speed' }),
  },
  {
    id: 'continuous-skater-bounds',
    name: 'Continuous skater bounds',
    fields: ['reps'],
    rx: phases(null, null, { sets: 3, reps: 6, text: '3 × 6' }),
  },
  {
    id: 'rotational-scoop-throw',
    name: 'Rotational scoop throw into a wall, basketball',
    fields: ['reps'],
    perSide: true,
    cue: 'Optional at Wednesday’s court session: 3 × 5 each side.',
    rx: all({ sets: 3, reps: 5, text: '3 × 5 each side' }),
  },
  {
    id: 'overhead-slam',
    name: 'Overhead slam or soccer throw',
    fields: ['reps'],
    rx: all({ sets: 3, reps: 5, text: '3 × 5' }),
  },
  {
    id: 'track-running',
    name: 'Track running',
    fields: [],
    cue: 'Dropped: football gives you that running.',
    rx: all({ sets: 6, text: 'Tempo runs or accelerations' }),
  },
  {
    id: 'joint-routine-skips',
    name: 'Daily joint routine + A-skips, B-skips',
    fields: [],
    warmup: true,
    rx: all({ sets: 1, text: '15 min' }),
  },
  {
    id: 'upper-pullup-pullover',
    name: 'Upper: pull-ups or DB pullover',
    fields: ['kg', 'reps'],
    rx: all({ sets: 3, reps: 10, text: '3 × 10' }),
  },
]

// =====================================================================================
// The week
// =====================================================================================

const LOWER: SessionPlan = {
  key: 'lower',
  weekday: 0,
  title: 'Lower A — jumps and strength',
  goal: 'Max-intent jumps, heavy legs, knee-over-toe strength',
  minutes: '85 min',
  note: 'Your one big leg day: jumps first while you’re fresh, then the heavy back squat, with Romanian deadlifts covering the hip hinge.',
  items: [
    { exercise: EX.jointRoutineSunday },
    { exercise: EX.pogoHops, jumpBlock: true },
    { exercise: EX.approachJump, jumpBlock: true },
    { exercise: EX.dropLanding, jumpBlock: true },
    { exercise: EX.dropJump, jumpBlock: true, phaseAlternative: true },
    { exercise: EX.depthJump, jumpBlock: true, phaseAlternative: true },
    { exercise: EX.backSquat, fewerOnScrimmage: true },
    { exercise: EX.wallSit, fewerOnScrimmage: true },
    { exercise: EX.pinSquatPush, fewerOnScrimmage: true, phaseAlternative: true },
    { exercise: EX.splitSquatThp, fewerOnScrimmage: true },
    { exercise: EX.rdl, fewerOnScrimmage: true },
    { exercise: EX.slCalfRaiseDb, fewerOnScrimmage: true },
    { exercise: EX.calfRaise2Up1Down, fewerOnScrimmage: true, phaseAlternative: true },
    { exercise: EX.calfRaiseBouncing, fewerOnScrimmage: true, phaseAlternative: true },
    { exercise: EX.calfRaiseSlow, fewerOnScrimmage: true, phaseAlternative: true },
  ],
}

const UPPER: SessionPlan = {
  key: 'upper',
  weekday: 1,
  title: 'Upper + rotation',
  goal: 'Arm swing, hip-to-shoulder power, shoulder health, plus a muscle finisher',
  minutes: '85 min',
  items: [
    { exercise: EX.jointRoutineUpper },
    { exercise: EX.landminePunch },
    { exercise: EX.dbSnatch },
    { exercise: EX.pullupOrPullover },
    { exercise: EX.landminePress },
    { exercise: EX.dbBench },
    { exercise: EX.dbRow },
    { exercise: EX.landmineRotation },
    { exercise: EX.externalRotation },
    { exercise: EX.proneYT },
    { exercise: EX.plankPullThrough },
    { exercise: EX.lateralRaise, group: 'Finisher' },
    { exercise: EX.curls, group: 'Finisher' },
    { exercise: EX.triceps, group: 'Finisher' },
  ],
}

const RESILIENCE: SessionPlan = {
  key: 'resilience',
  weekday: 2,
  title: 'Power and resilience',
  goal: 'Light power (hang clean, jump squats), hamstrings, hip flexors, ankle maintenance, plus a 20-min upper finisher',
  minutes: '70 min',
  note: 'A few fast, max-intent reps with long rests, then hamstring, hip flexor, knee and ankle work. Block 6: a recovery day — keep everything light and skip the upper finisher if you feel flat.',
  items: [
    { exercise: EX.jointRoutineTuesday },
    { exercise: EX.cleanPull },
    { exercise: EX.hangPowerClean },
    { exercise: EX.jumpSquat },
    { exercise: EX.lineHopStick },
    { exercise: EX.skaterBoundStick, phaseAlternative: true },
    { exercise: EX.nordicCurl },
    { exercise: EX.hipThrust },
    { exercise: EX.reverseNordic },
    { exercise: EX.copenhagen },
    { exercise: EX.slCalfRaiseFailure },
    { exercise: EX.pikeLift, group: 'Hip flexors' },
    { exercise: EX.kneeRaise, group: 'Hip flexors' },
    { exercise: EX.standingMarch, group: 'Hip flexors' },
    { exercise: EX.inclineDbPress, group: 'Upper finisher' },
    { exercise: EX.oneArmRow, group: 'Upper finisher' },
    { exercise: EX.lateralRaise, group: 'Upper finisher' },
    { exercise: EX.rearDeltFly, group: 'Upper finisher' },
    { exercise: EX.curls, group: 'Upper finisher' },
    { exercise: EX.skullCrusher, group: 'Upper finisher' },
    { exercise: EX.jeffersonCurl, group: 'Optional' },
  ],
}

export const SESSIONS: Record<SessionKey, SessionPlan> = { lower: LOWER, upper: UPPER, resilience: RESILIENCE }
export const SESSION_ORDER: SessionKey[] = ['lower', 'upper', 'resilience']

/** Sessions logged with the first version of the program (4 gym days). History only. */
const LEGACY_TITLES: Record<LegacySessionKey, string> = {
  mon: 'Lower A — strength (old plan)',
  tue: 'Upper + rotation (old plan)',
  wed: 'Lower B — jumps (old plan)',
  sat: 'Resilience + track (old plan)',
}

export const CUSTOM_SESSION_TITLE = 'Custom workout'

export function sessionTitle(kind: SessionKind): string {
  if (kind === 'custom') return CUSTOM_SESSION_TITLE
  if (kind in SESSIONS) return SESSIONS[kind as SessionKey].title
  return LEGACY_TITLES[kind as LegacySessionKey]
}

/** A session of the current program (as opposed to a custom workout or an old-plan session). */
export function isProgramSession(kind: SessionKind): kind is SessionKey {
  return kind in SESSIONS
}

/** What the program says for days without a gym session (JS weekday -> text). */
export const OTHER_DAYS: Record<number, { title: string; goal: string }> = {
  3: {
    title: 'Volleyball technique (self-organised)',
    goal: 'Passing, setting, serving and defence as much as you want. Approach footwork as walk-throughs or half-height take-offs. Cap it at 15–20 near-max jumps and stop when they get lower or slower. Optional: 3 × 5 basketball wall throws each side.',
  },
  4: { title: 'Football (evening)', goal: 'Daily joint routine as warm-up. Wear the ankle brace or tape.' },
  5: { title: 'Volleyball training', goal: 'Daily joint routine as warm-up. Wear the ankle brace or tape.' },
  6: {
    title: 'At your parents’',
    goal: 'Optional 10-min daily joint routine at home: backward walking, tib raises against a wall, calf raises on a step, single-leg balance, couch stretch.',
  },
}

// ---------- Tests: Sunday of each deload week (the end of every block), after the warm-up ----------

export const TESTS: Exercise[] = [
  {
    id: 'test-standing-vertical',
    name: 'Standing vertical jump',
    fields: ['cm'],
    cue: 'Jump and reach against a wall with chalk, or film with a jump app. Best of 3. Aim: steady rise each test.',
    rx: all({ sets: 3, text: 'Best of 3' }),
  },
  {
    id: 'test-approach-reach',
    name: 'Approach jump reach',
    fields: ['cm'],
    cue: 'Your real 3–4 step approach on the court, touch as high as you can. Best of 3.',
    rx: all({ sets: 3, text: 'Best of 3' }),
  },
  {
    id: 'test-sl-hop-distance',
    name: 'Single-leg hop for distance',
    fields: ['cm'],
    perSide: true,
    cue: 'Hop and stick on one leg. Best of 3 each leg. Aim: left within 10% of right.',
    rx: all({ sets: 3, text: 'Best of 3 each leg' }),
  },
  {
    id: 'test-sl-calf-raises',
    name: 'Single-leg calf raises',
    fields: ['reps'],
    perSide: true,
    cue: 'Reps to failure on a step, each leg. Aim: 25+ each, within 10% of each other.',
    rx: all({ sets: 1, text: 'To failure, each leg' }),
  },
  {
    id: 'test-sl-balance-eyes-closed',
    name: 'Single-leg balance, eyes closed',
    fields: ['sec'],
    perSide: true,
    cue: 'Seconds held, each leg. Aim: 30 s each leg.',
    rx: all({ sets: 1, text: 'Seconds held, each leg' }),
  },
  {
    id: 'test-atg-split-squat',
    name: 'ATG split squat',
    fields: ['kg'],
    perSide: true,
    cue: 'Full depth, front heel flat, back knee nearly down. Log 0 kg for bodyweight. Aim: bodyweight with no pain, then holding DBs.',
    rx: all({ sets: 1, text: 'Heaviest pain-free, each leg' }),
  },
  {
    id: 'test-knee-pain',
    name: 'Knee pain during a slow single-leg step-down',
    fields: ['pain'],
    cue: 'Right knee, 0–10. Aim: falling to 0–2. (Back squat: your best set of 3 at RPE 8 is read from the Sunday log.)',
    rx: all({ sets: 1, text: '0–10' }),
  },
]

export const KNEE_RULE = {
  limit: 3,
  text: 'Pain up to 3/10 during exercise is fine if it settles by the next morning and isn’t creeping up week to week. Above 3/10, or worse the next morning: cut that exercise’s range or load, halve the next jump session, and lean on wall sits (5 × 45 s) until it settles. Two bad weeks in a row: drop all depth work and pogos and go back to block 1 loading.',
  seePhysio:
    'See a sports physio or doctor if the knee swells, locks, gives way, hurts sharply or at night, or isn’t clearly improving after 3–4 weeks.',
}

// ---------- lookups ----------

const ALL_EXERCISES: Exercise[] = (() => {
  const byId = new Map<string, Exercise>()
  for (const k of SESSION_ORDER) for (const item of SESSIONS[k].items) byId.set(item.exercise.id, item.exercise)
  for (const e of [...TESTS, ...RETIRED_EXERCISES]) if (!byId.has(e.id)) byId.set(e.id, e)
  return [...byId.values()]
})()

/** Every program exercise (current plan, tests and retired ones), in program order. */
export function programExercises(): Exercise[] {
  return ALL_EXERCISES
}
