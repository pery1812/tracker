/**
 * The "Bulletproof Volleyball Program" (version 2): 12 weeks, 3 phases, 3 gym days
 * (Sunday lower, Monday upper, Tuesday resilience) around volleyball and football.
 *
 * This is static plan content, not user data, so it lives in code rather than the database.
 * Logged sets refer to exercises by `id`. NEVER change an existing id: past logs would lose their
 * exercise. When a movement changes between phases (e.g. wall sit -> overloaded pull) it is a
 * separate exercise with its own id, so "last time" and progress charts compare like with like.
 * Exercises dropped from the plan stay in the library (see RETIRED_EXERCISES) so old logs still show.
 */
import type { Field, LegacySessionKey, SessionKey, SessionKind } from './types'

export type Phase = 1 | 2 | 3
export type { Field, SessionKey }

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
  /** A gentler start for the first weeks of the phase, e.g. Nordics 2 × 3 in weeks 1–2. */
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
  rx: Partial<Record<Phase, Rx>>
}

/** An exercise as it appears in a session. */
export interface SessionItem {
  exercise: Exercise
  /** Done straight after the previous exercise, same letter numbered on (seated calf raise "I", then "I2"). */
  continuesPrevious?: boolean
  /** Replaces the previous exercise in other phases (wall sit -> overloaded pull): same letter. */
  phaseAlternative?: boolean
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

export const PROGRAM_WEEKS = 12
export const DELOAD_WEEKS = [4, 8]
export const TEST_WEEKS = [1, 4, 8, 12]
/** Program weeks start on Sunday (the first gym day). */
export const PROGRAM_WEEK_STARTS_ON = 0

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

export const DELOAD_NOTE = 'Deload week: about 40% fewer sets, same weights, no depth jumps. Tests on Sunday.'

export const SCRIMMAGE_NOTE =
  'Scrimmage Sunday: the scrimmage is your jump session, so pogos, approach jumps and depth landings are dropped and D–H have one set fewer. Do them before the scrimmage if there are a few hours between, otherwise after. Legs dead afterwards? Move D–H to Tuesday and skip Tuesday’s session.'

/** Same prescription in every phase. */
const all = (rx: Rx): Partial<Record<Phase, Rx>> => ({ 1: rx, 2: rx, 3: rx })

// =====================================================================================
// Exercise library. Ids are permanent.
// =====================================================================================

const EX = {
  // ---------- warm-ups ----------
  jointRoutine: {
    id: 'joint-routine',
    name: 'Daily joint routine',
    fields: [],
    warmup: true,
    cue: 'Backward walking 3 min · tibialis raise 1 × 20–25 · calf raise straight knee 1 × 15 each · calf raise bent knee 1 × 15 each · single-leg balance 2 × 30 s each · Patrick step 1 × 15 each · couch stretch + 90/90 switches. Left side first. If the knee is sore, stop the Patrick step at a shallower depth — don’t skip it.',
    rx: all({ sets: 1, text: '12 min' }),
  },
  jointRoutineASkips: {
    id: 'joint-routine-askips',
    name: 'Daily joint routine + A-skips, 2 × 20 m',
    fields: [],
    warmup: true,
    rx: all({ sets: 1, text: '15 min' }),
  },
  jointRoutineUpper: {
    id: 'joint-routine-upper',
    name: 'Daily joint routine + arm circles, light DB Y-T raises',
    fields: [],
    warmup: true,
    rx: all({ sets: 1, text: '15 min' }),
  },

  // ---------- jumps ----------
  pogoHops: {
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
  approachJump: {
    id: 'approach-jump',
    name: 'Approach jump',
    fields: ['reps', 'cm'],
    cue: 'On the indoor court if it’s free. Long fast penultimate step, plant heel first, both arms swing all the way back then drive up. Log your reach in cm if you mark it.',
    rx: {
      1: { sets: 3, reps: 3, text: '3 × 3, 2-step approach, technique' },
      2: { sets: 4, reps: 3, text: '4 × 3, full 3–4 step approach, max' },
      3: { sets: 5, reps: 2, text: '5 × 2, max, mark your reach' },
    },
  },
  dropLanding: {
    id: 'drop-landing',
    name: 'Drop landing',
    fields: ['reps', 'cm'],
    cue: 'Step off a bench or stacked plates; don’t jump off. Log the drop height.',
    rx: { 1: { sets: 3, reps: 4, text: 'From 30 cm, 3 × 4, stick' } },
  },
  dropJump: {
    id: 'drop-jump',
    name: 'Drop then jump',
    fields: ['reps', 'cm'],
    cue: 'Step off, don’t jump off. Log the drop height.',
    rx: { 2: { sets: 3, reps: 4, skipOnDeload: true, text: 'From 30 cm, 3 × 4' } },
  },
  depthJump: {
    id: 'depth-jump',
    name: 'Depth jump',
    fields: ['reps', 'cm'],
    cue: 'Step off from 30–45 cm and spend as little time on the ground as possible. Log the drop height.',
    rx: { 3: { sets: 4, reps: 3, text: 'From 30–45 cm, 4 × 3' } },
  },

  // ---------- lower strength ----------
  deadlift: {
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
  wallSit: {
    id: 'wall-sit',
    name: 'Isometric: wall sit at 60–70° knee bend',
    fields: ['sec'],
    cue: 'Isometric holds often ease tendon pain for a few hours.',
    rx: { 1: { sets: 4, seconds: 45, text: '4 × 45 s' } },
  },
  overloadedPull: {
    id: 'overloaded-pull',
    name: 'Isometric: overloaded barbell pull',
    fields: ['sec', 'kg'],
    cue: 'Load the bar heavier than you can lift, raise it on stacked plates so it sits just above your knees, then pull as hard as you can. It shouldn’t move.',
    rx: {
      2: { sets: 4, seconds: 5, text: '4 × 5 s max effort' },
      3: { sets: 3, seconds: 5, text: '3 × 5 s' },
    },
  },
  atgSplitSquat: {
    id: 'atg-split-squat',
    name: 'ATG split squat',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Front heel flat, knee travels past toes, back knee nearly touching the floor. Left leg first. If the knee flares, swap for a reverse lunge to a shorter range that week and keep the wall sits.',
    rx: {
      1: { sets: 3, reps: 8, kg: 0, text: '3 × 8 each, bodyweight or light DBs' },
      2: { sets: 3, reps: 6, text: '3 × 6 each, heavier DBs' },
      3: { sets: 3, reps: 5, text: '3 × 5 each, heavy' },
    },
  },
  rdl: {
    id: 'rdl',
    name: 'Romanian deadlift',
    fields: ['kg', 'reps'],
    cue: 'Barbell or dumbbells. 3-second lowering, stop when your hamstrings are fully stretched. Short on time? Cut to 2 sets.',
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8' },
      2: { sets: 3, reps: 6, text: '3 × 6' },
      3: { sets: 2, reps: 5, text: '2 × 5' },
    },
  },
  slCalfRaiseDb: {
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

  // ---------- upper, rotation, arm swing ----------
  landminePunch: {
    id: 'landmine-rotational-punch',
    name: 'Landmine rotational punch',
    fields: ['reps'],
    perSide: true,
    cue: 'Stand side-on, bar end at your back hip in both hands. Drive the back hip through and punch the bar up and out, finishing on the ball of your back foot. Light: empty bar or one small plate. Every rep as fast as possible.',
    rx: {
      1: { sets: 3, reps: 5, text: '3 × 5 each side' },
      2: { sets: 4, reps: 4, text: '4 × 4 each side' },
      3: { sets: 5, reps: 3, text: '5 × 3 each side, max speed' },
    },
  },
  dbSnatch: {
    id: 'db-snatch',
    name: 'One-arm dumbbell snatch',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Dip and drive from your legs and hips, let the dumbbell float up close to your body, and punch it overhead in one move. Legs to hips to arm: the same chain as a spike. Moderate weight; stop if the speed drops.',
    rx: {
      1: { sets: 3, reps: 4, text: '3 × 4 each arm' },
      2: { sets: 4, reps: 3, text: '4 × 3 each arm' },
      3: { sets: 4, reps: 3, text: '4 × 3 each arm, heavier' },
    },
  },
  pullupOrPullover: {
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
  landminePress: {
    id: 'landmine-press',
    name: 'Half-kneeling landmine press',
    fields: ['kg', 'reps'],
    perSide: true,
    cue: 'Kneel on the side of the pressing arm, press up and slightly forward. Squeeze the glute of the down knee so your lower back doesn’t arch.',
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8 each' },
      2: { sets: 4, reps: 6, text: '4 × 6 each' },
      3: { sets: 3, reps: 5, text: '3 × 5 each' },
    },
  },
  dbBench: {
    id: 'db-bench',
    name: 'Dumbbell bench press',
    fields: ['kg', 'reps'],
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8' },
      2: { sets: 4, reps: 5, text: '4 × 5' },
      3: { sets: 3, reps: 5, text: '3 × 5, then 3 clap or fast push-ups' },
    },
  },
  dbRow: {
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
  landmineRotation: {
    id: 'landmine-rotation',
    name: 'Landmine rotation (rainbow)',
    fields: ['kg', 'reps'],
    cue: 'Bar end at arm’s length overhead, swing it down to one hip, then the other, turning your hips and pivoting your back foot. Arms stay long; the hips lead, like the spike.',
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8 each side' },
      2: { sets: 3, reps: 6, text: '3 × 6, faster' },
      3: { sets: 3, reps: 6, text: '3 × 6, max speed' },
    },
  },
  externalRotation: {
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
    rx: {
      1: { sets: 3, reps: 8, text: '3 × 8 each side' },
      2: { sets: 3, reps: 10, text: '3 × 10 each' },
      3: { sets: 3, reps: 10, text: '3 × 10 each' },
    },
  },
  lateralRaise: {
    id: 'upper-lateral-raise',
    name: 'Finisher: lateral raise',
    fields: ['kg', 'reps'],
    cue: 'Muscle finisher, RPE 8. Keeps the muscle from your hypertrophy year.',
    rx: all({ sets: 3, reps: 15, text: '3 × 15, RPE 8' }),
  },
  curls: {
    id: 'upper-curls',
    name: 'Finisher: dumbbell curls',
    fields: ['kg', 'reps'],
    rx: all({ sets: 2, reps: 12, text: '2 × 12, RPE 8' }),
  },
  triceps: {
    id: 'upper-triceps',
    name: 'Finisher: overhead triceps extension',
    fields: ['kg', 'reps'],
    rx: all({ sets: 2, reps: 12, text: '2 × 12, RPE 8' }),
  },

  // ---------- ankle, knee, ATG resilience ----------
  lineHopStick: {
    id: 'line-hop-stick',
    name: 'Lateral hop and stick: line hop',
    fields: ['reps'],
    perSide: true,
    cue: 'Hold every landing for 2 s. Control work for the left ankle, not power.',
    rx: { 1: { sets: 3, reps: 5, text: 'Line hop, 3 × 5 each way' } },
  },
  skaterBoundStick: {
    id: 'skater-bound-stick',
    name: 'Lateral hop and stick: skater bound',
    fields: ['reps'],
    perSide: true,
    cue: 'Hold every landing for 2 s. Control work for the left ankle, not power.',
    rx: {
      2: { sets: 3, reps: 5, text: 'Skater bound and stick, 3 × 5 each' },
      3: { sets: 3, reps: 6, text: 'Skater bound and stick, 3 × 6 each, longer' },
    },
  },
  backwardRunning: {
    id: 'backward-running',
    name: 'Backward running, or backward walking on an inclined treadmill',
    fields: [],
    cue: 'Classic ATG knee work; strengthens the quads with little knee stress.',
    rx: {
      1: { sets: 4, text: '4 × 30 m' },
      2: { sets: 4, text: '4 × 40 m' },
      3: { sets: 4, text: '4 × 40 m, faster' },
    },
  },
  gobletSquat: {
    id: 'heel-elevated-goblet-squat',
    name: 'Heel-elevated goblet squat',
    fields: ['kg', 'reps'],
    cue: 'Heels on plates, knees fully forward. RPE 7.',
    rx: {
      1: { sets: 3, reps: 10, text: '3 × 10, 3-second lowering' },
      2: { sets: 3, reps: 8, text: '3 × 8, heavier' },
      3: { sets: 3, reps: 6, text: '3 × 6' },
    },
  },
  reverseNordic: {
    id: 'reverse-nordic',
    name: 'Reverse Nordic',
    fields: ['reps'],
    cue: 'Kneel, lean back with a straight line from knees to head. Only as far as comfortable.',
    rx: {
      1: { sets: 3, reps: 6, text: '3 × 6, partial range' },
      2: { sets: 3, reps: 8, text: '3 × 8' },
      3: { sets: 3, reps: 8, text: '3 × 8, deeper' },
    },
  },
  nordicCurl: {
    id: 'nordic-curl',
    name: 'Nordic hamstring curl, lowering only',
    fields: ['reps'],
    cue: 'Feet anchored by a partner, or under a heavily loaded barbell padded with a towel. Catch yourself with your hands early. Expect sore hamstrings the first time.',
    rx: {
      1: { sets: 3, reps: 4, easierThroughWeek: { week: 2, sets: 2, reps: 3 }, text: '2 × 3 in weeks 1–2, then 3 × 4' },
      2: { sets: 3, reps: 5, text: '3 × 5' },
      3: { sets: 3, reps: 6, text: '3 × 6' },
    },
  },
  copenhagen: {
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
  jeffersonCurl: {
    id: 'jefferson-curl',
    name: 'Jefferson curl',
    fields: ['kg', 'reps'],
    cue: 'Stand on the wooden box or a bench, roll down one vertebra at a time. Very light: this is for range.',
    rx: {
      1: { sets: 2, reps: 8, kg: 5, text: '2 × 8, empty bar or 5 kg' },
      2: { sets: 2, reps: 8, kg: 10, text: '2 × 8, 10 kg' },
      3: { sets: 2, reps: 8, kg: 15, text: '2 × 8, 15 kg' },
    },
  },
  tibialisLoaded: {
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
  seatedCalfRaise: {
    id: 'seated-calf-raise',
    name: 'Seated calf raise',
    fields: ['kg', 'reps'],
    cue: 'DBs on your knees, toes on a plate. Then go straight into single-leg calf raises to failure.',
    rx: {
      1: { sets: 3, reps: 15, text: '3 × 15' },
      2: { sets: 3, reps: 12, text: '3 × 12' },
      3: { sets: 3, reps: 10, text: '3 × 10' },
    },
  },
  slCalfRaiseFailure: {
    id: 'sl-calf-raise-failure',
    name: 'Then: single-leg calf raise to failure',
    fields: ['reps'],
    perSide: true,
    cue: 'Log the reps. The left should catch up to the right.',
    rx: all({ sets: 1, text: '1 set each leg' }),
  },
  armSwingDrill: {
    id: 'arm-swing-drill',
    name: 'Arm swing drill, no jump',
    fields: ['reps'],
    cue: 'Step into your approach plant, swing both arms all the way back, then drive them up hard while rising onto your toes.',
    rx: all({ sets: 2, reps: 10, text: '2 × 10' }),
  },
} satisfies Record<string, Exercise>

/**
 * Exercises from the first version of the program that version 2 dropped. Kept so old sessions,
 * "last time" and charts still show them, and so you can still add them to a session by hand.
 */
export const RETIRED_EXERCISES: Exercise[] = [
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
    id: 'continuous-skater-bounds',
    name: 'Continuous skater bounds',
    fields: ['reps'],
    rx: { 3: { sets: 3, reps: 6, text: '3 × 6' } },
  },
  {
    id: 'rotational-scoop-throw',
    name: 'Rotational scoop throw into a wall, basketball',
    fields: ['reps'],
    perSide: true,
    cue: 'Turn from your back hip and let the arms follow. Throw as fast as you can, not as hard. (Now optional at Wednesday’s court session: 3 × 5 each side.)',
    rx: all({ sets: 3, reps: 5, text: '3 × 5 each side' }),
  },
  {
    id: 'overhead-slam',
    name: 'Overhead slam or soccer throw',
    fields: ['reps'],
    cue: 'Reach back into a big stretch, then whip forward and down hard.',
    rx: all({ sets: 3, reps: 5, text: '3 × 5' }),
  },
  {
    id: 'track-running',
    name: 'Track running',
    fields: [],
    cue: 'Dropped in version 2: football gives you that running.',
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
  {
    id: 'upper-incline-db-press',
    name: 'Upper: incline DB press',
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
  note: 'Your one big leg day: jumps first while you’re fresh, then heavy strength.',
  items: [
    { exercise: EX.jointRoutineASkips },
    { exercise: EX.pogoHops, jumpBlock: true },
    { exercise: EX.approachJump, jumpBlock: true },
    { exercise: EX.dropLanding, jumpBlock: true },
    { exercise: EX.dropJump, jumpBlock: true, phaseAlternative: true },
    { exercise: EX.depthJump, jumpBlock: true, phaseAlternative: true },
    { exercise: EX.deadlift, fewerOnScrimmage: true },
    { exercise: EX.wallSit, fewerOnScrimmage: true },
    { exercise: EX.overloadedPull, fewerOnScrimmage: true, phaseAlternative: true },
    { exercise: EX.atgSplitSquat, fewerOnScrimmage: true },
    { exercise: EX.rdl, fewerOnScrimmage: true },
    { exercise: EX.slCalfRaiseDb, fewerOnScrimmage: true },
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
    { exercise: EX.lateralRaise },
    { exercise: EX.curls },
    { exercise: EX.triceps },
  ],
}

const RESILIENCE: SessionPlan = {
  key: 'resilience',
  weekday: 2,
  title: 'Ankle, knee and ATG resilience',
  goal: 'Ankle stability, knee-over-toe strength, hamstrings. No jumping',
  minutes: '55 min',
  note: 'Slow and controlled, no jumping for height, so it won’t take anything away from Wednesday.',
  items: [
    { exercise: EX.jointRoutine },
    { exercise: EX.lineHopStick },
    { exercise: EX.skaterBoundStick, phaseAlternative: true },
    { exercise: EX.backwardRunning },
    { exercise: EX.gobletSquat },
    { exercise: EX.reverseNordic },
    { exercise: EX.nordicCurl },
    { exercise: EX.copenhagen },
    { exercise: EX.jeffersonCurl },
    { exercise: EX.tibialisLoaded },
    { exercise: EX.seatedCalfRaise },
    { exercise: EX.slCalfRaiseFailure, continuesPrevious: true },
    { exercise: EX.armSwingDrill },
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
  6: { title: 'At your parents’', goal: 'Optional 10-min daily joint routine at home: backward walking, tib raises against a wall, calf raises on a step, single-leg balance, couch stretch.' },
}

// ---------- Tests: Sunday of weeks 1, 4, 8 and 12, after the warm-up ----------

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
    cue: 'Right knee, 0–10. Aim: falling to 0–2. (Deadlift: your best set of 3 at RPE 8 is read from the Sunday log.)',
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
