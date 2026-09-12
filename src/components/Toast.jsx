import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'

export default function Toast({ mensagem, onFechar }) {
  useEffect(() => {
    if (!mensagem) return
    const t = setTimeout(onFechar, 4500)
    return () => clearTimeout(t)
  }, [mensagem, onFechar])

  if (!mensagem) return null

  return (
    <div className="fixed top-4 right-4 z-[80] max-w-xs animate-[fadeIn_0.15s_ease-out]">
      <div className="card-elevated border-clay-500/30 bg-white dark:bg-navy-900 p-3.5 flex items-start gap-2.5">
        <AlertCircle size={17} className="text-clay-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-navy-700 dark:text-navy-200 flex-1">{mensagem}</p>
        <button onClick={onFechar} className="text-navy-400 hover:text-navy-700 dark:hover:text-white flex-shrink-0">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
