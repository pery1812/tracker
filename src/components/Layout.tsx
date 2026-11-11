import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { signOut } from '../lib/auth'
import { HabitsIcon, StatsIcon, TodayIcon, WorkoutsIcon } from './icons'
import { ImportLocalData } from './ImportLocalData'

const NAV_ITEMS = [
  { to: '/', label: 'Today', Icon: TodayIcon },
  { to: '/habits', label: 'Habits', Icon: HabitsIcon },
  { to: '/workouts', label: 'Workouts', Icon: WorkoutsIcon },
  { to: '/stats', label: 'Stats', Icon: StatsIcon },
] as const

/**
 * Phone first: a fixed bottom tab bar. From the `md` breakpoint (768px) up,
 * the bottom bar is hidden and a left sidebar is shown instead.
 */
export function Layout() {
  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar — tablets and laptops */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-8 px-3 text-lg font-bold tracking-tight">Habit Tracker</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <SignOutButton className="mt-auto px-3 text-left" />
      </aside>

      {/* Page content. Bottom padding leaves room for the tab bar and the iPhone home indicator. */}
      <main className="mx-auto w-full max-w-2xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-10">
        <ImportLocalData />
        <Outlet />
      </main>

      {/* Bottom tab bar — phones */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`
                }
              >
                <Icon className="size-6" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm('Sign out on this device?')) void signOut()
      }}
      className={`py-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white ${className}`}
    >
      Sign out
    </button>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}
