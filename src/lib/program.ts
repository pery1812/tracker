/**
 * The "Bulletproof Volleyball Program": 12 weeks, 3 phases, 4 gym days.
 *
 * This is static plan content, not user data, so it lives in code rather than the database.
 * Logged sets refer to exercises by `id`. NEVER change an existing id: past logs would lose their
 * exercise. When a movement changes between phases (e.g. wall sit -> overloaded pull) it is a
 * separate exercise with its own id, so "last time" and progress charts compare like with like.
 */

import type { SessionKey } from './types'

export type Phase = 1 | 2 | 3
export type { SessionKey }

/** What gets logged for each set. No fields = the set is just ticked off as done. */
export type Field = 'kg' | 'reps' | 'sec' | 'cm' | 'pain'

export const FIELD_UNITS: Record<Field, string> = {
  kg: 'kg',
  reps: 'reps',
  sec: 's',
  cm: 'cm',
  pain: '/10',
}

/** The prescription for one phase. */
export interface Rx {
  sets: number
  /** Target reps per set (used to pre-fill the log). */
  reps?: number
  /** Target seconds per set (holds, isometrics). */
  seconds?: number
  /** Suggested starting weight. */
  kg?: number
  /** Exactly as written in the program, shown to you. */
  text: string
  /** Log left and right separately, left first. Overrides the exercise default for this phase. */
  perSide?: boolean
  /** Left out of deload weeks (4 and 8). */
  skipOnDeload?: boolean
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
  rx: Partial<Record<Phase, Rx>>
}

export interface SessionPlan {
  key: SessionKey
  /** JS weekday: 1 = Monday ... 6 = Saturday. */
  weekday: number
  title: string
  goal: string
  minutes: string
  exercises: Exercise[]
}

export const PROGRAM_WEEKS = 12
export const DELOAD_WEEKS = [4, 8]
export const TEST_WEEKS = [1, 4, 8, 12]

export const PHASES: Record<Phase, { name: string; weeks: string; goal: string; lifting: string }> = {
  1: {
    name: 'Foundation',
    weeks: '1–4',
    goal: 'Settle knee pain, retrain the ankle, learn to land and approach',
    lifting: '3–4 sets × 6–10 reps, RPE 7, 3-second lowering',
  },
  2: {
    name: 'Strength–power',
    weeks: '5–8',
    goal: 'Heavier lifts, max isometrics, full approaches, depth drops',
    lifting: '4–5 × 4–6, RPE 8',
  },
  3: {
    name: 'Reactive peak',
    weeks: '9–12',
    goal: 'Convert strength to jump height with full intent',
    lifting: '3–4 × 3–5, RPE 8, lift-then-jump pairs',
  },
}

export const DELOAD_NOTE = 'Deload week: about 40% fewer sets, same weights, no depth jumps. Tests on Wednesday.'

/** Same prescription in every phase. */
const all = (rx: Rx): Partial<Record<Phase, Rx>> => ({ 1: rx, 2: rx, 3: rx })

// ---------- Monday — Lower A: strength ----------

const MON: SessionPlan = {
  key: 'mon',
  weekday: 1,
  title: 'Lower A — strength',
  goal: 'Heavy legs, knee-over-toe strength',
  minutes: '75 min',
  exercises: [
    {
      id: 'joint-routine',
      name: 'Daily joint routine',
      fields: [],
      warmup: true,
      cue: 'Backward walking 3 min · tibialis raise 1 × 20–25 · calf raise straight knee 1 × 15 each · calf raise bent knee 1 × 15 each · single-leg balance 2 × 30 s each · Patrick step 1 × 15 each · couch stretch + 90/90 switches. Left side first.',
      rx: all({ sets: 1, text: '12 min' }),
    },
    {
      id: 'box-jump',
      name: 'Box jump onto the wooden box, step down',
      fields: ['reps', 'cm'],
      cue: 'Land softly in the same position you take off. Step down, never jump down. Log the box height.',
      rx: {
        1: { sets: 4, reps: 3, text: '4 × 3, stick 2 s' },
        2: { sets: 4, reps: 3, text: '4 × 3, max height' },
        3: { sets: 3, reps: 3, text: '3 × 3' },
      },
    },
    {
      id: 'deadlift',
      name: 'Barbell deadlift from the floor',
      fields: ['kg', 'reps'],
      cue: 'Push the floor away rather than leaning back. Weeks 9–12: after each set rest 90 s, then 2 max countermovement jumps.',
      rx: {
        1: { sets: 4, reps: 6, text: '4 × 6, RPE 7' },
        2: { sets: 5, reps: 4, text: '5 × 4, RPE 8' },
        3: { sets: 4, reps: 3, text: '4 × 3, RPE 8 + 2 jumps after each set' },
      },
    },
    {
      id: 'wall-sit',
      name: 'Isometric: wall sit at 60–70° knee bend',
      fields: ['sec'],
      cue: 'Isometric holds often ease tendon pain for a few hours.',
      rx: { 1: { sets: 4, seconds: 45, text: '4 × 45 s' } },
    },
    {
      id: 'overloaded-pull',
      name: 'Isometric: overloaded barbell pull',
      fields: ['sec', 'kg'],
      cue: 'Load the bar heavier than you can lift, raise it on stacked plates so it sits just above your knees, then pull as hard as you can. It shouldn’t move.',
      rx: {
        2: { sets: 4, seconds: 5, text: '4 × 5 s max effort' },
        3: { sets: 3, seconds: 5, text: '3 × 5 s' },
      },
    },
    {
      id: 'atg-split-squat',
      name: 'ATG split squat',
      fields: ['kg', 'reps'],
      perSide: true,
      cue: 'Front heel flat, knee travels past toes, back knee nearly touching the floor. Left leg first. If the knee flares, swap for a reverse lunge to a shorter range.',
      rx: {
        1: { sets: 3, reps: 8, kg: 0, text: '3 × 8 each, bodyweight or light DBs' },
        2: { sets: 3, reps: 6, text: '3 × 6 each, heavier DBs' },
        3: { sets: 3, reps: 5, text: '3 × 5 each, heavy' },
      },
    },
    {
      id: 'rdl',
      name: 'Romanian deadlift',
      fields: ['kg', 'reps'],
      cue: 'Barbell or dumbbells. 3-second lowering, stop when your hamstrings are fully stretched.',
      rx: {
        1: { sets: 3, reps: 8, text: '3 × 8' },
        2: { sets: 3, reps: 6, text: '3 × 6' },
        3: { sets: 3, reps: 5, text: '3 × 5' },
      },
    },
    {
      id: 'sl-calf-raise-db',
      name: 'Single-leg calf raise, straight knee, holding a DB',
      fields: ['kg', 'reps'],
      perSide: true,
      cue: 'On a plate or the box edge, full range. Left first; right does the same reps.',
      rx: {
        1: { sets: 3, reps: 12, text: '3 × 12 each' },
        2: { sets: 3, reps: 10, text: '3 × 10 each, heavier' },
        3: { sets: 3, reps: 8, text: '3 × 8 each, heavier' },
      },
    },
    {
      id: 'seated-calf-raise',
      name: 'Seated calf raise',
      fields: ['kg', 'reps'],
      cue: 'Sit on the box or a bench, balls of your feet on a plate, heavy dumbbells resting on your knees.',
      rx: {
        1: { sets: 3, reps: 15, text: '3 × 15' },
        2: { sets: 3, reps: 12, text: '3 × 12' },
        3: { sets: 3, reps: 10, text: '3 × 10' },
      },
    },
  ],
}

// ---------- Tuesday — Upper body, rotation and arm swing ----------

const TUE: SessionPlan = {
  key: 'tue',
  weekday: 2,
  title: 'Upper + rotation',
  goal: 'Arm swing, hip-to-shoulder power, shoulder health',
  minutes: '70 min',
  exercises: [
    {
      id: 'joint-routine-upper',
      name: 'Daily joint routine + arm circles, light DB Y-T raises',
      fields: [],
      warmup: true,
      rx: all({ sets: 1, text: '15 min' }),
    },
    {
      id: 'rotational-scoop-throw',
      name: 'Rotational scoop throw into a wall, basketball',
      fields: ['reps'],
      perSide: true,
      cue: 'Turn from your back hip and let the arms follow. Throw as fast as you can, not as hard.',
      rx: {
        1: { sets: 3, reps: 5, text: '3 × 5 each side' },
        2: { sets: 4, reps: 4, text: '4 × 4 each side' },
        3: { sets: 5, reps: 3, text: '5 × 3 each side, max speed' },
      },
    },
    {
      id: 'overhead-slam',
      name: 'Overhead slam or soccer throw',
      fields: ['reps'],
      cue: 'Mimics the arm swing: reach back into a big stretch, then whip forward and down hard.',
      rx: {
        1: { sets: 3, reps: 5, text: '3 × 5' },
        2: { sets: 3, reps: 5, text: '3 × 5' },
        3: { sets: 4, reps: 4, text: '4 × 4' },
      },
    },
    {
      id: 'pullup-or-pullover',
      name: 'Pull-up, or DB pullover on a bench',
      fields: ['kg', 'reps'],
      cue: 'Pullover: one DB in both hands, lower it behind your head until your lats stretch. Log 0 kg for bodyweight pull-ups.',
      rx: {
        1: { sets: 3, reps: 8, text: '3 × 8' },
        2: { sets: 4, reps: 5, text: '4 × 5 (pullover 4 × 8)' },
        3: { sets: 3, reps: 5, text: '3 × 4–5 (pullover 3 × 8)' },
      },
    },
    {
      id: 'landmine-press',
      name: 'Half-kneeling landmine press',
      fields: ['kg', 'reps'],
      perSide: true,
      cue: 'Kneel on the side of the pressing arm, press up and slightly forward. Squeeze the glute of the down knee.',
      rx: {
        1: { sets: 3, reps: 8, text: '3 × 8 each' },
        2: { sets: 4, reps: 6, text: '4 × 6 each' },
        3: { sets: 3, reps: 5, text: '3 × 5 each' },
      },
    },
    {
      id: 'db-bench',
      name: 'Dumbbell bench press',
      fields: ['kg', 'reps'],
      rx: {
        1: { sets: 3, reps: 8, text: '3 × 8' },
        2: { sets: 4, reps: 5, text: '4 × 5' },
        3: { sets: 3, reps: 5, text: '3 × 5, then 3 clap or fast push-ups' },
      },
    },
    {
      id: 'db-row',
      name: 'Chest-supported DB row, or barbell bent-over row',
      fields: ['kg', 'reps'],
      cue: 'Chest on an incline bench if there is one.',
      rx: {
        1: { sets: 3, reps: 10, text: '3 × 10' },
        2: { sets: 3, reps: 8, text: '3 × 8' },
        3: { sets: 3, reps: 8, text: '3 × 8' },
      },
    },
    {
      id: 'landmine-rotation',
      name: 'Landmine rotation (rainbow)',
      fields: ['kg', 'reps'],
      cue: 'Bar end at arm’s length overhead, swing it down to one hip, then the other, turning your hips. Hips lead, like the spike.',
      rx: {
        1: { sets: 3, reps: 8, text: '3 × 8 each side' },
        2: { sets: 3, reps: 6, text: '3 × 6, faster' },
        3: { sets: 3, reps: 6, text: '3 × 6, max speed' },
      },
    },
    {
      id: 'external-rotation',
      name: 'Side-lying DB external rotation',
      fields: ['kg', 'reps'],
      perSide: true,
      cue: '2–5 kg. Elbow pinned to your side, slow lowering. Hitting arm especially.',
      rx: {
        1: { sets: 3, reps: 12, text: '3 × 12–15' },
        2: { sets: 3, reps: 12, text: '3 × 12' },
        3: { sets: 3, reps: 12, text: '3 × 12' },
      },
    },
    {
      id: 'prone-yt-raise',
      name: 'Prone Y and T raise, light DBs',
      fields: ['kg', 'reps'],
      cue: 'Face down on an incline bench. Upper back and rear shoulder.',
      rx: all({ sets: 2, reps: 12, text: '2 × 12 each' }),
    },
    {
      id: 'plank-pull-through',
      name: 'Plank DB pull-through',
      fields: ['reps'],
      cue: 'In a push-up plank, drag a DB under your body without letting the hips twist. Pallof press instead if the cable is free.',
      rx: {
        1: { sets: 3, reps: 8, text: '3 × 8 each side' },
        2: { sets: 3, reps: 10, text: '3 × 10 each' },
        3: { sets: 3, reps: 10, text: '3 × 10 each' },
      },
    },
  ],
}

// ---------- Wednesday — Lower B: jumps and landings ----------

const WED: SessionPlan = {
  key: 'wed',
  weekday: 3,
  title: 'Lower B — jumps',
  goal: 'Max-intent jumps, landings, ankle stability',
  minutes: '60 min',
  exercises: [
    {
      id: 'joint-routine-askips',
      name: 'Daily joint routine + A-skips, 2 × 20 m',
      fields: [],
      warmup: true,
      rx: all({ sets: 1, text: '15 min' }),
    },
    {
      id: 'pogo-hops',
      name: 'Pogo hops',
      fields: ['reps'],
      cue: 'Stiff ankles, bounce off the balls of your feet, short ground contact. Left first. Only if the knee rule passed this week.',
      rx: {
        1: { sets: 3, reps: 10, text: '3 × 10, both legs, small' },
        2: { sets: 3, reps: 15, text: '3 × 15 both legs + 2 × 8 each leg' },
        3: { sets: 3, reps: 10, perSide: true, text: '3 × 10 each leg, fast' },
      },
    },
    {
      id: 'approach-jump',
      name: 'Approach jump',
      fields: ['reps', 'cm'],
      cue: 'Long fast penultimate step, plant heel first, both arms swing all the way back then drive up. Log your reach in cm if you mark it.',
      rx: {
        1: { sets: 3, reps: 3, text: '3 × 3, 2-step approach, technique' },
        2: { sets: 4, reps: 3, text: '4 × 3, full 3–4 step approach, max' },
        3: { sets: 5, reps: 2, text: '5 × 2, max, mark your reach' },
      },
    },
    {
      id: 'drop-landing',
      name: 'Drop landing',
      fields: ['reps', 'cm'],
      cue: 'Step off, don’t jump off. Bench or stacked plates. Log the drop height.',
      rx: { 1: { sets: 3, reps: 4, text: 'From 30 cm, 3 × 4, stick' } },
    },
    {
      id: 'drop-jump',
      name: 'Drop then jump',
      fields: ['reps', 'cm'],
      cue: 'Step off, don’t jump off. Log the drop height.',
      rx: { 2: { sets: 3, reps: 4, skipOnDeload: true, text: 'From 30 cm, 3 × 4' } },
    },
    {
      id: 'depth-jump',
      name: 'Depth jump',
      fields: ['reps', 'cm'],
      cue: 'Step off from 30–45 cm and spend as little time on the ground as possible. Log the drop height.',
      rx: { 3: { sets: 4, reps: 3, text: 'From 30–45 cm, 4 × 3' } },
    },
    {
      id: 'line-hop-stick',
      name: 'Line hop and stick',
      fields: ['reps'],
      perSide: true,
      cue: 'Trains the loose left ankle to handle sideways landings. Hold each stick for 2 s.',
      rx: { 1: { sets: 3, reps: 5, text: '3 × 5 each way' } },
    },
    {
      id: 'skater-bound-stick',
      name: 'Skater bound and stick',
      fields: ['reps'],
      perSide: true,
      cue: 'Hold each stick for 2 s.',
      rx: { 2: { sets: 3, reps: 5, text: '3 × 5 each' } },
    },
    {
      id: 'continuous-skater-bounds',
      name: 'Continuous skater bounds',
      fields: ['reps'],
      rx: { 3: { sets: 3, reps: 6, text: '3 × 6' } },
    },
    {
      id: 'db-jump',
      name: 'Dumbbell jump',
      fields: ['kg', 'reps'],
      cue: 'Arms hang straight; jump as high as you can. Land softly, reset each rep.',
      rx: {
        2: { sets: 4, reps: 3, kg: 5, text: '4 × 3, a light DB in each hand (5–10 kg)' },
        3: { sets: 4, reps: 3, text: '4 × 3, light, max speed' },
      },
    },
    {
      id: 'heel-elevated-goblet-squat',
      name: 'Heel-elevated goblet squat',
      fields: ['kg', 'reps'],
      cue: 'Heels on plates or a slant board, knees fully forward. Builds the quads that protect the knee.',
      rx: {
        1: { sets: 3, reps: 10, text: '3 × 10, 3-second lowering' },
        2: { sets: 3, reps: 8, text: '3 × 8, heavier' },
        3: { sets: 3, reps: 6, text: '3 × 6' },
      },
    },
    {
      id: 'copenhagen-plank',
      name: 'Copenhagen side plank',
      fields: ['sec'],
      perSide: true,
      cue: 'Inner thigh strength for cutting in football and landing stability.',
      rx: {
        1: { sets: 2, seconds: 20, text: '2 × 20 s each, knee version' },
        2: { sets: 3, seconds: 25, text: '3 × 25 s each' },
        3: { sets: 3, seconds: 20, text: '3 × 20 s each, full lever' },
      },
    },
  ],
}

// ---------- Saturday — Resilience, track and upper muscle ----------

const SAT: SessionPlan = {
  key: 'sat',
  weekday: 6,
  title: 'Resilience + track',
  goal: 'ATG full range, sprint mechanics, upper muscle',
  minutes: '60–70 min',
  exercises: [
    {
      id: 'joint-routine-skips',
      name: 'Daily joint routine + A-skips, B-skips',
      fields: [],
      warmup: true,
      rx: all({ sets: 1, text: '15 min' }),
    },
    {
      id: 'track-running',
      name: 'Track running',
      fields: [],
      cue: 'Skip if you played football or a scrimmage in the last 24 h. Walk back between reps.',
      rx: {
        1: { sets: 6, text: 'Tempo runs 6 × 100 m at 60–70% effort' },
        2: { sets: 9, text: 'Accelerations 6 × 20 m + 3 × 40 m at 85%' },
        3: { sets: 8, text: 'Accelerations 4 × 20 m + flying 10s 4 × at 95%' },
      },
    },
    {
      id: 'backward-running',
      name: 'Backward running, or backward walking on an inclined treadmill',
      fields: [],
      cue: 'Classic ATG knee work; strengthens the quads with low knee stress.',
      rx: {
        1: { sets: 4, text: '4 × 30 m' },
        2: { sets: 4, text: '4 × 40 m' },
        3: { sets: 4, text: '4 × 40 m, faster' },
      },
    },
    {
      id: 'reverse-nordic',
      name: 'Reverse Nordic',
      fields: ['reps'],
      cue: 'Kneel, lean back with a straight line from knees to head. Go only as far as comfortable.',
      rx: {
        1: { sets: 3, reps: 6, text: '3 × 6, partial range' },
        2: { sets: 3, reps: 8, text: '3 × 8' },
        3: { sets: 3, reps: 8, text: '3 × 8, deeper' },
      },
    },
    {
      id: 'nordic-curl',
      name: 'Nordic hamstring curl (lowering only)',
      fields: ['reps'],
      cue: 'Feet anchored by a partner, or under a heavily loaded barbell padded with a towel.',
      rx: {
        1: { sets: 3, reps: 4, text: '3 × 4, hands catch early' },
        2: { sets: 3, reps: 5, text: '3 × 5' },
        3: { sets: 3, reps: 6, text: '3 × 6' },
      },
    },
    {
      id: 'jefferson-curl',
      name: 'Jefferson curl',
      fields: ['kg', 'reps'],
      cue: 'Stand on the box or a bench, roll down one vertebra at a time. Very light: this is for range.',
      rx: {
        1: { sets: 2, reps: 8, kg: 5, text: '2 × 8, empty bar or 5 kg' },
        2: { sets: 2, reps: 8, kg: 10, text: '2 × 8, 10 kg' },
        3: { sets: 2, reps: 8, kg: 15, text: '2 × 8, 15 kg' },
      },
    },
    {
      id: 'tibialis-raise-loaded',
      name: 'Tibialis raise, loaded',
      fields: ['kg', 'reps'],
      cue: 'Sit on the box edge with a DB held between your feet.',
      rx: {
        1: { sets: 3, reps: 15, text: '3 × 15' },
        2: { sets: 3, reps: 15, text: '3 × 15, heavier' },
        3: { sets: 3, reps: 15, text: '3 × 15, heavier' },
      },
    },
    {
      id: 'sl-calf-raise-failure',
      name: 'Single-leg calf raise to failure',
      fields: ['reps'],
      perSide: true,
      cue: 'Log the reps. Left side should catch up to the right.',
      rx: all({ sets: 1, text: '1 set each leg' }),
    },
    {
      id: 'upper-pullup-pullover',
      name: 'Upper: pull-ups or DB pullover',
      fields: ['kg', 'reps'],
      cue: 'RPE 8. Keep this to hold your muscle.',
      rx: all({ sets: 3, reps: 10, text: '3 × 10' }),
    },
    {
      id: 'upper-incline-db-press',
      name: 'Upper: incline DB press',
      fields: ['kg', 'reps'],
      rx: all({ sets: 3, reps: 10, text: '3 × 10' }),
    },
    {
      id: 'upper-lateral-raise',
      name: 'Upper: lateral raise',
      fields: ['kg', 'reps'],
      rx: all({ sets: 3, reps: 15, text: '3 × 15' }),
    },
    {
      id: 'upper-curls',
      name: 'Upper: curls',
      fields: ['kg', 'reps'],
      rx: all({ sets: 2, reps: 12, text: '2 × 12' }),
    },
    {
      id: 'upper-triceps',
      name: 'Upper: triceps',
      fields: ['kg', 'reps'],
      rx: all({ sets: 2, reps: 12, text: '2 × 12' }),
    },
  ],
}

export const SESSIONS: Record<SessionKey, SessionPlan> = { mon: MON, tue: TUE, wed: WED, sat: SAT }
export const SESSION_ORDER: SessionKey[] = ['mon', 'tue', 'wed', 'sat']

/** What the program says for days without a gym session (JS weekday -> text). */
export const OTHER_DAYS: Record<number, { title: string; goal: string }> = {
  4: { title: 'Football (evening)', goal: 'Daily joint routine as warm-up' },
  5: { title: 'Volleyball (evening)', goal: 'Daily joint routine as warm-up' },
  0: { title: 'Off', goal: 'Easy walk or swim' },
}

// ---------- Tests: Wednesday of weeks 1, 4, 8 and 12, after the warm-up ----------

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
    cue: 'Right knee, 0–10. Aim: falling to 0–2.',
    rx: all({ sets: 1, text: '0–10' }),
  },
]

export const KNEE_RULE = {
  limit: 3,
  text: 'Pain up to 3/10 during exercise is fine if it settles by the next morning and isn’t creeping up week to week. Above 3/10, or worse the next morning: cut that exercise’s range or load, halve the next jump session, and lean on wall sits (5 × 45 s) until it settles. Two bad weeks in a row: drop all depth work and pogos and stay in phase 1 loading.',
  seePhysio:
    'See a sports physio or doctor if the knee swells, locks, gives way, hurts sharply or at night, or isn’t clearly improving after 3–4 weeks.',
}

// ---------- lookups ----------

const ALL_EXERCISES = [...SESSION_ORDER.flatMap((k) => SESSIONS[k].exercises), ...TESTS]
const BY_ID = new Map(ALL_EXERCISES.map((e) => [e.id, e]))

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id)
}

/** Exercises that can show a progress chart (anything with a number logged), in program order. */
export function chartableExercises(): Exercise[] {
  return ALL_EXERCISES.filter((e) => e.fields.length > 0 && !e.id.startsWith('test-knee'))
}
