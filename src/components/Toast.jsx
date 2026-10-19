import { useEffect, useRef } from 'react'
import { AlertCircle, X } from 'lucide-react'

const DURACAO_MS = 6000

export default function Toast({ mensagem, onFechar }) {
  // guarda o callback mais recente sem reiniciar o relógio a cada re-render
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar

  useEffect(() => {
    if (!mensagem) return undefined
    const t = setTimeout(() => fecharRef.current && fecharRef.current(), DURACAO_MS)
    return () => clearTimeout(t)
  }, [mensagem])

  if (!mensagem) return null

  return (
    <div className="fixed top-4 right-4 z-[80] max-w-xs animate-[fadeIn_0.15s_ease-out]">
      <div className="card-elevated border-clay-500/30 bg-white dark:bg-navy-900 overflow-hidden">
        <div className="p-3.5 flex items-start gap-2.5">
          <AlertCircle size={17} className="text-clay-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-navy-700 dark:text-navy-200 flex-1">{mensagem}</p>
          <button onClick={onFechar} className="text-navy-400 hover:text-navy-700 dark:hover:text-white flex-shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="h-1 bg-clay-500/15">
          <div key={mensagem} className="h-full bg-clay-500" style={{ animation: `toastBarra ${DURACAO_MS}ms linear forwards` }} />
        </div>
      </div>
    </div>
  )
}
