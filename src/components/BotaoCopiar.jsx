import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Botãozinho que copia o número de telefone (só os dígitos) para a área de transferência.
export default function BotaoCopiar({ texto, rotulo = 'Copiar número' }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar(e) {
    e.stopPropagation()
    const valor = String(texto || '').replace(/\D/g, '')
    if (!valor) return
    try {
      await navigator.clipboard.writeText(valor)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = valor
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* sem suporte */
      }
      document.body.removeChild(ta)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title={copiado ? 'Copiado!' : rotulo}
      className="inline-flex items-center justify-center h-5 w-5 rounded text-navy-400 hover:text-navy-700 hover:bg-navy-50 dark:hover:bg-navy-800 dark:hover:text-white transition-colors"
    >
      {copiado ? <Check size={12} className="text-sage-600" /> : <Copy size={12} />}
    </button>
  )
}
