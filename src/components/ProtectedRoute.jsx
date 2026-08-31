import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, allow }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-navy-400">
        Carregando…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-navy-600">
        Sua conta ainda não tem um perfil configurado. Peça ao analista de People Analytics para
        cadastrar seu acesso.
      </div>
    )
  }

  if (allow && !allow.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
