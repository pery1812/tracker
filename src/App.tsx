import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBanner } from './components/ErrorBanner'
import { Layout } from './components/Layout'
import { useSession } from './hooks/useSession'
import { HabitsPage } from './pages/HabitsPage'
import { SignInPage } from './pages/SignInPage'
import { StatsPage } from './pages/StatsPage'
import { TodayPage } from './pages/TodayPage'
import { WorkoutSessionPage } from './pages/WorkoutSessionPage'
import { WorkoutsPage } from './pages/WorkoutsPage'

export default function App() {
  const session = useSession()

  // Still restoring the saved session: render nothing rather than flashing the sign-in form.
  if (session === undefined) return null

  return (
    <>
      <ErrorBanner />
      {session === null ? (
        <SignInPage />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<TodayPage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="workouts" element={<WorkoutsPage />} />
              <Route path="workouts/s/:id" element={<WorkoutSessionPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      )}
    </>
  )
}
