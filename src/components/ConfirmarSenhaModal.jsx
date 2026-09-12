import { useState } from 'react'
import { X, Lock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function ConfirmarSenhaModal({ onClose, onConfirmado }) {
  const { user } = useAuth()
  const [senha, setSenha] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar(e) {
    e.preventDefault()
    setErro('')
    setVerificando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: senha })
    setVerificando(false)
    if (error) {
      setErro('Senha incorreta.')
      return
    }
    onConfirmado()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/50 flex items-center justify-center p-4 z-[70]">
      <form onSubmit={confirmar} className="card-elevated w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
            <Lock size={17} className="text-navy-400" /> Confirme sua senha
          </h2>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-navy-500 dark:text-navy-400 mb-4">
          Para ver o resultado, confirme sua senha de acesso.
        </p>
        <input
          type="password"
          autoFocus
          required
          className="field-input"
          placeholder="••••••••"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erro && <p className="text-sm text-clay-600 mt-2">{erro}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={verificando} className="btn-primary">
            {verificando ? 'Verificando…' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  )
}
