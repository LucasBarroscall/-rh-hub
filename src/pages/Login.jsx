import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (!loading && session) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError('E-mail ou senha incorretos.')
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-navy-800 flex items-center justify-center">
            <Users size={19} className="text-amber-400" />
          </div>
          <div className="text-left">
            <p className="font-display text-lg leading-none text-navy-900">Hub RH</p>
            <p className="text-[11px] text-navy-400 mt-0.5">People Analytics</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-7 space-y-4">
          <div>
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-clay-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-navy-400 mt-5">
          Acesso restrito à equipe de recrutamento. Fale com o analista de People Analytics para
          receber suas credenciais.
        </p>
      </div>
    </div>
  )
}
