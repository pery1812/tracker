/** Preset habit colours (Tailwind 500 shades). Stored on the habit as hex. */
export const HABIT_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Pink', hex: '#ec4899' },
] as const

export const DEFAULT_HABIT_COLOR = HABIT_COLORS[3].hex
