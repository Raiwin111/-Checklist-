import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/auth-context'
import { AppLayout } from './AppLayout'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground">
        <div className="h-8 w-8 animate-spin border border-rule border-t-signal" />
      </div>
    )
  }

  if (!session) {
    return <Navigate replace to="/login" />
  }

  return <AppLayout />
}
