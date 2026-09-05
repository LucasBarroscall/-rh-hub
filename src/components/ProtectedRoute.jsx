import { Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, allow }) {
  const { session, profile, loading, signOut } = useAuth()

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

  if (profile.ativo === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <AlertTriangle size={28} className="mx-auto text-clay-600 mb-3" />
          <p className="text-navy-700 dark:text-navy-200 mb-4">
            Sua conta está <strong>inativa</strong>. Entre em contato com o analista de People Analytics
            para reativar seu acesso.
          </p>
          <button onClick={signOut} className="btn-secondary">
            Sair
          </button>
        </div>
      </div>
    )
  }

  if (allow && !allow.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
