import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [inativo, setInativo] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (!loading && session) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInativo(false)
    setSubmitting(true)
    const { data, error } = await signIn(email, password)
    if (error) {
      setSubmitting(false)
      setError('E-mail ou senha incorretos.')
      return
    }

    // Perfil inativo não pode entrar, mesmo com senha correta.
    const { data: perfil } = await supabase.from('profiles').select('ativo').eq('id', data.user.id).single()
    if (perfil && perfil.ativo === false) {
      await supabase.auth.signOut()
      setSubmitting(false)
      setInativo(true)
      return
    }

    setSubmitting(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50 dark:bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img
            src="https://callink.com.br/wp-content/uploads/2024/08/Callink-branca-e-colorida-3-1536x636.png"
            alt="Callink"
            className="h-8 w-auto dark:hidden"
          />
          <img
            src="https://callink.com.br/wp-content/uploads/2024/08/Callink-branca-e-colorida-3-1536x636.png"
            alt="Callink"
            className="h-8 w-auto hidden dark:block brightness-0 invert"
          />
          <p className="text-[11px] text-navy-400 mt-2">Hub de Recrutamento</p>
        </div>

        {inativo && (
          <div className="flex items-start gap-2.5 rounded-lg bg-clay-500/10 text-clay-700 dark:text-clay-500 px-4 py-3.5 mb-5 text-sm">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <p>
              Sua conta está <strong>inativa</strong>. Entre em contato com o analista de People Analytics
              para reativar seu acesso.
            </p>
          </div>
        )}

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
