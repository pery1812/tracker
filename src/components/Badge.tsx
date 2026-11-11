const TONES = {
  sky: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-50',
  violet: 'bg-violet-100 text-violet-900 dark:bg-violet-900 dark:text-violet-50',
  emerald: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-50',
} as const

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
}
